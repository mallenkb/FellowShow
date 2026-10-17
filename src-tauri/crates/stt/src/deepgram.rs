use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use crossbeam_channel::Receiver;
use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::Message;
use url::Url;

use crate::error::SttError;
use crate::keyterms::bible_keyterms;
use crate::provider::{wait_for_stop, SttProvider};
use crate::types::{SttConfig, TranscriptEvent, Word};

const MAX_RECONNECT_ATTEMPTS: u32 = 5;
const RECONNECT_DELAY: Duration = Duration::from_secs(1);
/// Batch up to 250ms of audio before sending (at 16kHz, that is 4000 samples).
const BATCH_SAMPLES: usize = 4000;

pub struct DeepgramClient {
    config: SttConfig,
    cancelled: Arc<AtomicBool>,
}

impl std::fmt::Debug for DeepgramClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DeepgramClient")
            .field("model", &self.config.model)
            .finish_non_exhaustive()
    }
}

impl DeepgramClient {
    pub fn new(config: SttConfig) -> Self {
        Self {
            config,
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Build the Deepgram WebSocket URL with query parameters and keyword boosting.
    fn build_url(&self) -> Result<Url, SttError> {
        let mut url = Url::parse("wss://api.deepgram.com/v1/listen")
            .map_err(|e| SttError::ConnectionFailed(e.to_string()))?;

        {
            let mut q = url.query_pairs_mut();
            q.append_pair("model", &self.config.model);
            q.append_pair("encoding", &self.config.encoding);
            q.append_pair("sample_rate", &self.config.sample_rate.to_string());
            q.append_pair("channels", "1");
            q.append_pair("punctuate", "true");
            q.append_pair("smart_format", "true");
            q.append_pair("interim_results", "true");
            q.append_pair("endpointing", "300");
            q.append_pair("utterance_end_ms", "1000");
            q.append_pair("vad_events", "true");

            if let Some(ref lang) = self.config.language {
                q.append_pair("language", lang);
            }

            // Deepgram Nova-3 keyword boosting: uses `keyterm` (not `keywords`).
            // Each keyterm is a separate query param. Max 100 per request.
            let core_terms = vec![
                "Jesus".to_string(),
                "Christ".to_string(),
                "God".to_string(),
                "Lord".to_string(),
                "Holy Spirit".to_string(),
            ];
            let bible_terms = bible_keyterms();

            // Deduplicate: core terms first, then bible_keyterms(), capped at 100.
            let mut seen = std::collections::HashSet::new();
            let mut all_keyterms: Vec<String> = Vec::new();
            for term in core_terms.into_iter().chain(bible_terms) {
                if seen.insert(term.clone()) {
                    all_keyterms.push(term);
                }
                if all_keyterms.len() >= 100 {
                    break;
                }
            }

            for term in &all_keyterms {
                q.append_pair("keyterm", term);
            }
            log::info!(
                "Deepgram keyterm boosting: {} keyterms added",
                all_keyterms.len()
            );
        }

        log::info!("Deepgram WebSocket URL: {}", url.as_str());
        Ok(url)
    }

    /// Connect to Deepgram and stream audio from `audio_rx`, emitting transcript events to `event_tx`.
    pub async fn connect(
        &self,
        audio_rx: Receiver<Vec<i16>>,
        event_tx: mpsc::Sender<TranscriptEvent>,
    ) -> Result<(), SttError> {
        if self.config.api_key.is_empty() {
            return Err(SttError::ApiKeyMissing);
        }

        let url = self.build_url()?;
        self.connect_url(audio_rx, event_tx, &url).await
    }

    async fn connect_url(
        &self,
        audio_rx: Receiver<Vec<i16>>,
        event_tx: mpsc::Sender<TranscriptEvent>,
        url: &Url,
    ) -> Result<(), SttError> {
        let cancelled = self.cancelled.clone();
        let mut attempts: u32 = 0;

        loop {
            if cancelled.load(Ordering::SeqCst) {
                log::info!("DeepgramClient: cancelled, stopping connection loop");
                break;
            }

            match self
                .try_connect(audio_rx.clone(), event_tx.clone(), url)
                .await
            {
                Ok(()) => {
                    // Clean shutdown
                    log::info!("DeepgramClient: connection closed normally");
                    break;
                }
                Err(e) => {
                    attempts += 1;
                    log::warn!(
                        "DeepgramClient: connection error (attempt {attempts}/{MAX_RECONNECT_ATTEMPTS}): {e}",
                    );

                    let _ = event_tx.send(TranscriptEvent::Disconnected).await;

                    if attempts >= MAX_RECONNECT_ATTEMPTS {
                        log::error!("DeepgramClient: max reconnection attempts reached");
                        let _ = event_tx
                            .send(TranscriptEvent::Error(format!(
                                "Max reconnection attempts reached: {e}"
                            )))
                            .await;
                        return Err(e);
                    }

                    tokio::select! {
                        () = tokio::time::sleep(RECONNECT_DELAY) => {},
                        () = wait_for_stop(&cancelled) => break,
                    }
                }
            }
        }

        Ok(())
    }

    /// Run one socket session, ending all audio work before reconnecting.
    #[expect(
        clippy::too_many_lines,
        reason = "socket and audio bridge share one lifecycle"
    )]
    async fn try_connect(
        &self,
        audio_rx: Receiver<Vec<i16>>,
        event_tx: mpsc::Sender<TranscriptEvent>,
        url: &Url,
    ) -> Result<(), SttError> {
        let mut request = url
            .as_str()
            .into_client_request()
            .map_err(|e| SttError::ConnectionFailed(e.to_string()))?;
        let auth_value = format!("Token {}", self.config.api_key);
        request.headers_mut().insert(
            "Authorization",
            HeaderValue::from_str(&auth_value)
                .map_err(|e| SttError::ConnectionFailed(e.to_string()))?,
        );

        let (ws_stream, _) = tokio::select! {
            result = tokio::time::timeout(Duration::from_secs(10), tokio_tungstenite::connect_async(request)) => {
                result.map_err(|_| SttError::ConnectionFailed("WebSocket connection timed out".into()))?
                    .map_err(|e| SttError::ConnectionFailed(e.to_string()))?
            },
            () = wait_for_stop(&self.cancelled) => return Ok(()),
        };
        let _ = event_tx.send(TranscriptEvent::Connected).await;
        let (mut write, mut read) = ws_stream.split();

        #[allow(clippy::items_after_statements)]
        enum WsCommand {
            Audio(Vec<u8>),
            KeepAlive,
            Close,
        }
        let (ws_tx, mut ws_rx) = mpsc::channel::<WsCommand>(64);
        let connection_done = Arc::new(AtomicBool::new(false));
        let audio_done = Arc::clone(&connection_done);
        let cancelled = Arc::clone(&self.cancelled);
        let audio_reader = tokio::task::spawn_blocking(move || {
            let mut batch_buf = Vec::with_capacity(BATCH_SAMPLES * 2);
            let mut last_send = std::time::Instant::now();
            while !cancelled.load(Ordering::SeqCst) && !audio_done.load(Ordering::SeqCst) {
                match audio_rx.recv_timeout(Duration::from_millis(50)) {
                    Ok(samples) => {
                        for sample in samples {
                            batch_buf.extend_from_slice(&sample.to_le_bytes());
                        }
                        if batch_buf.len() >= BATCH_SAMPLES * 2 {
                            if ws_tx
                                .blocking_send(WsCommand::Audio(std::mem::take(&mut batch_buf)))
                                .is_err()
                            {
                                break;
                            }
                            last_send = std::time::Instant::now();
                        }
                    }
                    Err(crossbeam_channel::RecvTimeoutError::Timeout) => {
                        if !batch_buf.is_empty()
                            && last_send.elapsed() >= Duration::from_millis(250)
                        {
                            if ws_tx
                                .blocking_send(WsCommand::Audio(std::mem::take(&mut batch_buf)))
                                .is_err()
                            {
                                break;
                            }
                            last_send = std::time::Instant::now();
                        }
                        if last_send.elapsed() >= Duration::from_secs(5) {
                            if ws_tx.blocking_send(WsCommand::KeepAlive).is_err() {
                                break;
                            }
                            last_send = std::time::Instant::now();
                        }
                    }
                    Err(crossbeam_channel::RecvTimeoutError::Disconnected) => {
                        if !batch_buf.is_empty()
                            && ws_tx.blocking_send(WsCommand::Audio(batch_buf)).is_err()
                        {
                            break;
                        }
                        let _ = ws_tx.blocking_send(WsCommand::Close);
                        break;
                    }
                }
            }
        });

        let result = async {
            let mut close_deadline = None;
            loop {
                tokio::select! {
                    () = wait_for_stop(&self.cancelled) => return Ok(()),
                    () = async {
                        if let Some(deadline) = close_deadline {
                            tokio::time::sleep_until(deadline).await;
                        } else {
                            std::future::pending::<()>().await;
                        }
                    } => return Ok(()),
                    message = read.next() => {
                        match message {
                            Some(Ok(Message::Text(text))) => {
                                if let Err(error) = parse_and_send(&text, &event_tx).await {
                                    if matches!(error, SttError::ConnectionFailed(_)) {
                                        return Err(error);
                                    }
                                    log::warn!("Deepgram response error: {error}");
                                }
                            }
                            Some(Ok(Message::Close(_))) | None => {
                                return if close_deadline.is_some() { Ok(()) } else {
                                    Err(SttError::ConnectionFailed("Server closed the audio stream unexpectedly".into()))
                                };
                            }
                            Some(Err(error)) => return Err(SttError::WebSocketError(error.to_string())),
                            Some(Ok(_)) => {},
                        }
                    }
                    command = ws_rx.recv(), if close_deadline.is_none() => {
                        let message = match command {
                            Some(WsCommand::Audio(data)) => Message::Binary(data.into()),
                            Some(WsCommand::KeepAlive) => Message::Text(r#"{"type":"KeepAlive"}"#.into()),
                            Some(WsCommand::Close) => {
                                close_deadline = Some(tokio::time::Instant::now() + Duration::from_secs(2));
                                Message::Text(r#"{"type":"CloseStream"}"#.into())
                            }
                            None => return Ok(()),
                        };
                        tokio::select! {
                            result = tokio::time::timeout(Duration::from_secs(5), write.send(message)) => {
                                result.map_err(|_| SttError::SendError("WebSocket send timed out".into()))?
                                    .map_err(|error| SttError::SendError(error.to_string()))?;
                            }
                            () = wait_for_stop(&self.cancelled) => return Ok(()),
                        }
                    }
                }
            }
        }.await;
        connection_done.store(true, Ordering::SeqCst);
        drop(ws_rx);
        audio_reader
            .await
            .map_err(|error| SttError::ConnectionFailed(format!("Audio reader failed: {error}")))?;
        result
    }

    /// Cancel the current connection and signal shutdown.
    pub fn stop(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }
}

#[cfg(test)]
#[path = "deepgram_fuzz.rs"]
mod input_fuzz;

#[cfg(test)]
#[path = "deepgram_e2e.rs"]
mod end_to_end;

/// Parse a Deepgram JSON response and send the corresponding `TranscriptEvent`.
async fn parse_and_send(
    text: &str,
    event_tx: &mpsc::Sender<TranscriptEvent>,
) -> Result<(), SttError> {
    let json: serde_json::Value =
        serde_json::from_str(text).map_err(|e| SttError::ParseError(e.to_string()))?;

    // Deepgram may send different message types; we only handle "Results"
    let msg_type = json
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or_default();

    match msg_type {
        "Error" => {
            let message = json
                .get("description")
                .or_else(|| json.get("message"))
                .and_then(serde_json::Value::as_str)
                .unwrap_or("Deepgram rejected the audio stream");
            let error = SttError::ConnectionFailed(message.to_string());
            let _ = event_tx
                .send(TranscriptEvent::Error(error.to_string()))
                .await;
            return Err(error);
        }
        "UtteranceEnd" => {
            let _ = event_tx.send(TranscriptEvent::UtteranceEnd).await;
            return Ok(());
        }
        "SpeechStarted" => {
            let _ = event_tx.send(TranscriptEvent::SpeechStarted).await;
            return Ok(());
        }
        "Results" => { /* continue parsing below */ }
        _ => {
            // Metadata, etc. — ignore silently.
            return Ok(());
        }
    }

    let is_final = json
        .get("is_final")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);

    let speech_final = json
        .get("speech_final")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);

    let channel = json.get("channel");
    let alternatives = channel
        .and_then(|c| c.get("alternatives"))
        .and_then(|a| a.as_array());

    let first_alt = alternatives.and_then(|arr| arr.first());

    let transcript = first_alt
        .and_then(|a| a.get("transcript"))
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string();

    let confidence = first_alt
        .and_then(|a| a.get("confidence"))
        .and_then(serde_json::Value::as_f64)
        .unwrap_or(0.0);

    let words = first_alt
        .and_then(|a| a.get("words"))
        .and_then(|w| w.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|w| {
                    Some(Word {
                        text: w.get("word")?.as_str()?.to_string(),
                        start: w.get("start")?.as_f64()?,
                        end: w.get("end")?.as_f64()?,
                        confidence: w.get("confidence")?.as_f64()?,
                        punctuated_word: w
                            .get("punctuated_word")
                            .and_then(|p| p.as_str())
                            .map(ToString::to_string),
                    })
                })
                .collect::<Vec<Word>>()
        })
        .unwrap_or_default();

    let event = if is_final {
        TranscriptEvent::Final {
            transcript,
            words,
            confidence,
            speech_final,
        }
    } else {
        TranscriptEvent::Partial { transcript, words }
    };

    event_tx
        .send(event)
        .await
        .map_err(|e| SttError::SendError(e.to_string()))?;

    Ok(())
}

// ── SttProvider implementation ───────────────────────────────────────────────

#[async_trait::async_trait]
impl SttProvider for DeepgramClient {
    async fn start(
        &self,
        audio_rx: Receiver<Vec<i16>>,
        event_tx: mpsc::Sender<TranscriptEvent>,
    ) -> Result<(), SttError> {
        if self.config.api_key.trim().is_empty() {
            return Err(SttError::ApiKeyMissing);
        }
        if let Err(error) = self.connect(audio_rx.clone(), event_tx.clone()).await {
            if self.cancelled.load(Ordering::SeqCst) {
                return Ok(());
            }
            log::warn!("[STT-Deepgram] WebSocket failed: {error}, switching to REST fallback");
            let rest_client = crate::rest::DeepgramRestClient::new(self.config.clone());
            let mut buffer = Vec::new();
            let mut last_flush = std::time::Instant::now();
            let result = async {
                loop {
                    if self.cancelled.load(Ordering::SeqCst) || event_tx.is_closed() {
                        break;
                    }
                    let disconnected = match audio_rx.try_recv() {
                        Ok(samples) => {
                            buffer.extend(samples);
                            false
                        }
                        Err(crossbeam_channel::TryRecvError::Empty) => {
                            tokio::time::sleep(Duration::from_millis(20)).await;
                            false
                        }
                        Err(crossbeam_channel::TryRecvError::Disconnected) => true,
                    };
                    if !buffer.is_empty()
                        && (disconnected || last_flush.elapsed() >= Duration::from_secs(5))
                    {
                        let events = tokio::select! {
                            result = rest_client.transcribe(&buffer) => result,
                            () = wait_for_stop(&self.cancelled) => break,
                        };
                        match events {
                            Ok(events) => {
                                let _ = event_tx.send(TranscriptEvent::Connected).await;
                                for event in events {
                                    let _ = event_tx.send(event).await;
                                }
                            }
                            Err(error) => {
                                let _ = event_tx
                                    .send(TranscriptEvent::Error(error.to_string()))
                                    .await;
                                return Err(error);
                            }
                        }
                        buffer.clear();
                        last_flush = std::time::Instant::now();
                    }
                    if disconnected {
                        break;
                    }
                }
                Ok(())
            }
            .await;
            let _ = event_tx.send(TranscriptEvent::Disconnected).await;
            return result;
        }
        Ok(())
    }

    fn stop(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }

    fn name(&self) -> &'static str {
        "deepgram"
    }
}
