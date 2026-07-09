use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use crossbeam_channel::Receiver;
use reqwest::multipart;
use serde::Deserialize;
use tokio::sync::mpsc;

use crate::error::SttError;
use crate::provider::SttProvider;
use crate::types::TranscriptEvent;

const CHUNK_SECONDS: usize = 5;

#[derive(Debug, Clone)]
pub struct OpenAiCompatibleConfig {
    pub api_key: String,
    pub endpoint: String,
    pub model: String,
    pub provider_name: &'static str,
    pub sample_rate: u32,
}

pub struct OpenAiCompatibleSttProvider {
    config: OpenAiCompatibleConfig,
    client: reqwest::Client,
    stop: Arc<AtomicBool>,
}

#[derive(Deserialize)]
struct TranscriptionResponse {
    text: String,
}

impl OpenAiCompatibleSttProvider {
    pub fn new(config: OpenAiCompatibleConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
            stop: Arc::new(AtomicBool::new(false)),
        }
    }

    async fn transcribe_chunk(&self, samples: &[i16]) -> Result<Option<String>, SttError> {
        if samples.is_empty() {
            return Ok(None);
        }

        let wav = encode_wav_mono_i16(samples, self.config.sample_rate)?;
        let part = multipart::Part::bytes(wav)
            .file_name("audio.wav")
            .mime_str("audio/wav")
            .map_err(|e| SttError::ParseError(format!("Invalid WAV part: {e}")))?;

        let form = multipart::Form::new()
            .text("model", self.config.model.clone())
            .text("response_format", "json")
            .part("file", part);

        let response = self
            .client
            .post(&self.config.endpoint)
            .bearer_auth(&self.config.api_key)
            .multipart(form)
            .send()
            .await
            .map_err(|e| {
                SttError::ConnectionFailed(format!(
                    "{} request failed: {e}",
                    self.config.provider_name
                ))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(SttError::ConnectionFailed(format!(
                "{} transcription API error {status}: {body}",
                self.config.provider_name
            )));
        }

        let parsed = response
            .json::<TranscriptionResponse>()
            .await
            .map_err(|e| {
                SttError::ParseError(format!(
                    "Failed to parse {} response: {e}",
                    self.config.provider_name
                ))
            })?;

        let text = parsed.text.trim().to_string();
        Ok((!text.is_empty()).then_some(text))
    }
}

#[async_trait::async_trait]
impl SttProvider for OpenAiCompatibleSttProvider {
    async fn start(
        &self,
        audio_rx: Receiver<Vec<i16>>,
        event_tx: mpsc::Sender<TranscriptEvent>,
    ) -> Result<(), SttError> {
        self.stop.store(false, Ordering::SeqCst);
        let _ = event_tx.send(TranscriptEvent::Connected).await;

        let target_samples = self.config.sample_rate as usize * CHUNK_SECONDS;
        let mut buffer = Vec::<i16>::with_capacity(target_samples);

        while !self.stop.load(Ordering::SeqCst) {
            match audio_rx.recv_timeout(Duration::from_millis(100)) {
                Ok(samples) => buffer.extend(samples),
                Err(crossbeam_channel::RecvTimeoutError::Timeout) => {}
                Err(crossbeam_channel::RecvTimeoutError::Disconnected) => break,
            }

            if buffer.len() >= target_samples {
                let chunk = std::mem::take(&mut buffer);
                match self.transcribe_chunk(&chunk).await {
                    Ok(Some(transcript)) => {
                        let _ = event_tx
                            .send(TranscriptEvent::Final {
                                transcript,
                                words: Vec::new(),
                                confidence: 0.9,
                                speech_final: true,
                            })
                            .await;
                    }
                    Ok(None) => {}
                    Err(e) => {
                        let _ = event_tx.send(TranscriptEvent::Error(e.to_string())).await;
                    }
                }
            }
        }

        if !buffer.is_empty() {
            if let Ok(Some(transcript)) = self.transcribe_chunk(&buffer).await {
                let _ = event_tx
                    .send(TranscriptEvent::Final {
                        transcript,
                        words: Vec::new(),
                        confidence: 0.9,
                        speech_final: true,
                    })
                    .await;
            }
        }

        let _ = event_tx.send(TranscriptEvent::Disconnected).await;
        Ok(())
    }

    fn stop(&self) {
        self.stop.store(true, Ordering::SeqCst);
    }

    fn name(&self) -> &'static str {
        self.config.provider_name
    }
}

fn encode_wav_mono_i16(samples: &[i16], sample_rate: u32) -> Result<Vec<u8>, SttError> {
    let data_len = u32::try_from(samples.len().saturating_mul(2))
        .map_err(|_| SttError::ParseError("audio chunk is too large for WAV encoding".into()))?;
    let mut out = Vec::with_capacity(44 + samples.len() * 2);

    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&(36 + data_len).to_le_bytes());
    out.extend_from_slice(b"WAVEfmt ");
    out.extend_from_slice(&16u32.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&sample_rate.to_le_bytes());
    out.extend_from_slice(&(sample_rate * 2).to_le_bytes());
    out.extend_from_slice(&2u16.to_le_bytes());
    out.extend_from_slice(&16u16.to_le_bytes());
    out.extend_from_slice(b"data");
    out.extend_from_slice(&data_len.to_le_bytes());

    for sample in samples {
        out.extend_from_slice(&sample.to_le_bytes());
    }

    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::encode_wav_mono_i16;

    #[test]
    fn wav_encoder_writes_header_and_samples() {
        let wav = encode_wav_mono_i16(&[i16::MIN, 0, i16::MAX], 16_000)
            .expect("small audio buffer should encode");

        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(&wav[36..40], b"data");
        assert_eq!(u32::from_le_bytes(wav[40..44].try_into().unwrap()), 6);
        assert_eq!(wav.len(), 50);
    }
}
