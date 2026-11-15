use std::collections::{HashMap, VecDeque};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use crossbeam_channel::{Receiver, TryRecvError};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::{json, Value};
use tokio::sync::mpsc;
use tokio::time::{interval, timeout, Instant, MissedTickBehavior};
use tokio_tungstenite::tungstenite::{client::IntoClientRequest, Message};

use crate::{provider::wait_for_stop, SttError, SttProvider, TranscriptEvent};

pub const OPENAI_LIVE_SAMPLE_RATE: u32 = 24_000;
const SAMPLE_RATE: usize = OPENAI_LIVE_SAMPLE_RATE as usize;
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const FINAL_TIMEOUT: Duration = Duration::from_secs(2);

pub const OPENAI_LIVE_MODEL: &str = "gpt-live-transcribe";

pub struct OpenAiRealtimeSttProvider {
    api_key: String,
    stop: AtomicBool,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum ServerEvent {
    #[serde(rename = "session.updated", alias = "transcription_session.updated")]
    Ready,
    #[serde(rename = "input_audio_buffer.committed")]
    Committed { item_id: String },
    #[serde(rename = "conversation.item.input_audio_transcription.delta")]
    Delta { item_id: String, delta: String },
    #[serde(rename = "conversation.item.input_audio_transcription.completed")]
    Completed { item_id: String, transcript: String },
    #[serde(rename = "conversation.item.input_audio_transcription.failed")]
    Failed { error: ServerError },
    #[serde(rename = "error")]
    Error { error: ServerError },
    #[serde(other)]
    Other,
}

#[derive(Deserialize)]
struct ServerError {
    message: String,
}

#[derive(Default)]
struct Turn {
    preview: String,
    final_text: Option<String>,
}

#[derive(Default)]
struct Transcript {
    turns: HashMap<String, Turn>,
    commits: VecDeque<Duration>,
    ordered: VecDeque<(String, Duration)>,
}

impl Transcript {
    async fn receive(
        &mut self,
        event: ServerEvent,
        events: &mpsc::Sender<TranscriptEvent>,
    ) -> Result<(), SttError> {
        match event {
            ServerEvent::Delta { item_id, delta } => {
                let visible = self.ordered.front().is_none_or(|(id, _)| id == &item_id);
                let turn = self.turns.entry(item_id).or_default();
                turn.preview.push_str(&delta);
                if visible {
                    let _ = events
                        .send(TranscriptEvent::Preview(turn.preview.clone()))
                        .await;
                }
            }
            ServerEvent::Committed { item_id } => {
                let offset = self.commits.pop_front().ok_or_else(|| {
                    SttError::ParseError("OpenAI acknowledged an unexpected audio commit".into())
                })?;
                self.ordered.push_back((item_id, offset));
                self.emit_ready(events).await;
            }
            ServerEvent::Completed {
                item_id,
                transcript,
            } => {
                self.turns.entry(item_id).or_default().final_text = Some(transcript);
                self.emit_ready(events).await;
            }
            ServerEvent::Error { error } | ServerEvent::Failed { error } => {
                return Err(SttError::WebSocketError(format!(
                    "OpenAI: {}",
                    error.message
                )));
            }
            ServerEvent::Ready | ServerEvent::Other => {}
        }
        Ok(())
    }

    async fn emit_ready(&mut self, events: &mpsc::Sender<TranscriptEvent>) {
        let mut updated = false;
        while let Some((id, offset)) = self.ordered.front() {
            let Some(text) = self
                .turns
                .get_mut(id)
                .and_then(|turn| turn.final_text.take())
            else {
                break;
            };
            let start_offset = Some(*offset);
            self.turns.remove(id);
            self.ordered.pop_front();
            updated = true;
            if !text.trim().is_empty() {
                let _ = events
                    .send(TranscriptEvent::Final {
                        transcript: text,
                        words: Vec::new(),
                        confidence: 0.9,
                        speech_final: true,
                        start_offset,
                    })
                    .await;
            }
        }
        if updated {
            let next = self
                .ordered
                .front()
                .and_then(|(id, _)| self.turns.get(id))
                .or_else(|| {
                    // Only one uncommitted turn can be streaming at a time.
                    if self.commits.is_empty() {
                        self.turns.values().next()
                    } else {
                        None
                    }
                });
            let preview = next.map_or_else(String::new, |turn| turn.preview.clone());
            let _ = events.send(TranscriptEvent::Preview(preview)).await;
        }
    }
}

#[derive(Default)]
struct AudioTurn {
    start: usize,
    samples: usize,
    quiet: usize,
    has_speech: bool,
}

impl AudioTurn {
    fn append(&mut self, samples: &[i16]) -> bool {
        self.samples += samples.len();
        let loud = samples
            .iter()
            .filter(|sample| sample.unsigned_abs() > 400)
            .count();
        if loud * 20 > samples.len() {
            self.quiet = 0;
            self.has_speech = true;
        } else {
            self.quiet += samples.len();
        }
        self.samples >= SAMPLE_RATE * 8
            || (self.has_speech && self.quiet >= SAMPLE_RATE * 650 / 1_000)
    }

    fn commit(&mut self, transcript: &mut Transcript) -> Message {
        transcript.commits.push_back(Duration::from_millis(
            self.start as u64 * 1_000 / SAMPLE_RATE as u64,
        ));
        *self = Self {
            start: self.start + self.samples,
            ..Self::default()
        };
        message(&json!({"type": "input_audio_buffer.commit"}))
    }
}

fn message(value: &Value) -> Message {
    Message::Text(value.to_string().into())
}

fn websocket_error(error: &tokio_tungstenite::tungstenite::Error) -> SttError {
    SttError::WebSocketError(format!("OpenAI: {error}"))
}

impl OpenAiRealtimeSttProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            stop: AtomicBool::new(false),
        }
    }

    async fn stream(
        &self,
        audio: Receiver<Vec<i16>>,
        events: &mpsc::Sender<TranscriptEvent>,
    ) -> Result<(), SttError> {
        let mut request = "wss://api.openai.com/v1/realtime?intent=transcription"
            .into_client_request()
            .map_err(|error| websocket_error(&error))?;
        let mut authorization = format!("Bearer {}", self.api_key)
            .parse::<tokio_tungstenite::tungstenite::http::HeaderValue>()
            .map_err(|_| SttError::ApiKeyMissing)?;
        authorization.set_sensitive(true);
        request.headers_mut().insert("Authorization", authorization);
        let (mut socket, _) = timeout(CONNECT_TIMEOUT, tokio_tungstenite::connect_async(request))
            .await
            .map_err(|_| SttError::ConnectionFailed("OpenAI connection timed out".into()))?
            .map_err(|error| websocket_error(&error))?;
        socket
            .send(message(&json!({
                "type": "session.update",
                "session": {
                    "type": "transcription",
                    "audio": { "input": {
                        "format": { "type": "audio/pcm", "rate": SAMPLE_RATE },
                        "transcription": { "model": OPENAI_LIVE_MODEL },
                        "turn_detection": null
                    }}
                }
            })))
            .await
            .map_err(|error| websocket_error(&error))?;

        let mut transcript = Transcript::default();
        let mut turn = AudioTurn::default();
        let mut ready = false;
        let ready_deadline = Instant::now() + CONNECT_TIMEOUT;
        let mut closing = None;
        let mut tick = interval(Duration::from_millis(10));
        tick.set_missed_tick_behavior(MissedTickBehavior::Skip);

        loop {
            tokio::select! {
                incoming = socket.next() => {
                    match incoming.transpose().map_err(|error| websocket_error(&error))? {
                        Some(Message::Text(text)) => {
                            let event = serde_json::from_str::<ServerEvent>(&text)
                                .map_err(|err| SttError::ParseError(format!("OpenAI: {err}")))?;
                            if matches!(event, ServerEvent::Ready) && !ready {
                                ready = true;
                                let _ = events.send(TranscriptEvent::Connected).await;
                            }
                            transcript.receive(event, events).await?;
                        }
                        Some(Message::Close(_)) | None => {
                            return Err(SttError::WebSocketError("OpenAI closed the transcription session".into()));
                        }
                        Some(_) => {}
                    }
                }
                _ = tick.tick() => {
                    if let Some(deadline) = closing {
                        if transcript.commits.is_empty() && transcript.ordered.is_empty() {
                            return Ok(());
                        }
                        if Instant::now() >= deadline {
                            return Err(SttError::WebSocketError("OpenAI did not finish the last audio turn".into()));
                        }
                    } else if !ready {
                        if Instant::now() >= ready_deadline {
                            return Err(SttError::ConnectionFailed("OpenAI did not confirm the transcription session".into()));
                        }
                    } else {
                        for _ in 0..8 {
                            match audio.try_recv() {
                                Ok(samples) if !samples.is_empty() => {
                                    let pcm: Vec<u8> = samples.iter().flat_map(|sample| sample.to_le_bytes()).collect();
                                    socket.send(message(&json!({
                                        "type": "input_audio_buffer.append",
                                        "audio": STANDARD.encode(pcm),
                                    }))).await.map_err(|error| websocket_error(&error))?;
                                    if turn.append(&samples) {
                                        socket.send(turn.commit(&mut transcript)).await.map_err(|error| websocket_error(&error))?;
                                    }
                                }
                                Ok(_) => {}
                                Err(TryRecvError::Empty) => break,
                                Err(TryRecvError::Disconnected) => {
                                    if turn.samples >= SAMPLE_RATE / 10 {
                                        socket.send(turn.commit(&mut transcript)).await.map_err(|error| websocket_error(&error))?;
                                    }
                                    closing = Some(Instant::now() + FINAL_TIMEOUT);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[async_trait::async_trait]
impl SttProvider for OpenAiRealtimeSttProvider {
    async fn start(
        &self,
        audio: Receiver<Vec<i16>>,
        events: mpsc::Sender<TranscriptEvent>,
    ) -> Result<(), SttError> {
        let result = tokio::select! {
            result = self.stream(audio, &events) => result,
            () = wait_for_stop(&self.stop) => Ok(()),
            () = events.closed() => Ok(()),
        };
        let _ = events.send(TranscriptEvent::Disconnected).await;
        result
    }

    fn stop(&self) {
        self.stop.store(true, Ordering::SeqCst);
    }

    fn name(&self) -> &'static str {
        "OpenAI"
    }
}
