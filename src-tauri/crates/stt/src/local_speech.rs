use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use crossbeam_channel::{Receiver, TryRecvError};
use serde::Deserialize;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{ChildStdin, Command};
use tokio::sync::mpsc;

use crate::provider::{wait_for_stop, SttProvider};
use crate::{SttError, TranscriptEvent};

const WORKER: &str = include_str!("local_speech_worker.py");

pub struct LocalSpeechProvider {
    python: PathBuf,
    root: PathBuf,
    model: &'static str,
    stopped: AtomicBool,
}

impl LocalSpeechProvider {
    #[must_use]
    pub fn new(python: PathBuf, root: PathBuf, model: &'static str) -> Self {
        Self {
            python,
            root,
            model,
            stopped: AtomicBool::new(false),
        }
    }

    pub fn worker_command(&self, action: &str) -> Command {
        let mut command = Command::new(&self.python);
        command
            .args(["-I", "-u", "-c", WORKER, self.model, action])
            .arg(&self.root)
            .current_dir(&self.root)
            .env("HF_HOME", self.root.join("hf-cache"))
            .env("HF_HUB_DISABLE_IMPLICIT_TOKEN", "1")
            .env("HF_HUB_DISABLE_TELEMETRY", "1")
            .env_remove("HF_TOKEN")
            .env_remove("OPENAI_API_KEY")
            .env_remove("DEEPGRAM_API_KEY")
            .env_remove("GROQ_API_KEY")
            .env_remove("OPENROUTER_API_KEY")
            .kill_on_drop(true);
        #[cfg(windows)]
        command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
        if action != "download" {
            command.env("HF_HUB_OFFLINE", "1");
        }
        command
    }
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum WorkerEvent {
    Ready,
    Partial { text: String },
    Final { text: String, start: f64 },
    Error { text: String },
}

fn io_error(error: &std::io::Error) -> SttError {
    SttError::ConnectionFailed(format!("Local speech worker: {error}"))
}

async fn write_audio(mut input: ChildStdin, audio: Receiver<Vec<i16>>) -> Result<(), SttError> {
    loop {
        match audio.try_recv() {
            Ok(samples) => {
                let bytes: Vec<u8> = samples.into_iter().flat_map(i16::to_le_bytes).collect();
                input
                    .write_all(&bytes)
                    .await
                    .map_err(|error| io_error(&error))?;
            }
            Err(TryRecvError::Empty) => tokio::time::sleep(Duration::from_millis(10)).await,
            Err(TryRecvError::Disconnected) => {
                return input.shutdown().await.map_err(|error| io_error(&error))
            }
        }
    }
}

#[async_trait::async_trait]
impl SttProvider for LocalSpeechProvider {
    async fn start(
        &self,
        audio_rx: Receiver<Vec<i16>>,
        event_tx: mpsc::Sender<TranscriptEvent>,
    ) -> Result<(), SttError> {
        let mut child = self
            .worker_command("run")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| io_error(&error))?;
        let input = child.stdin.take().ok_or_else(|| {
            SttError::ConnectionFailed("Local speech input is unavailable".into())
        })?;
        let output = child.stdout.take().ok_or_else(|| {
            SttError::ConnectionFailed("Local speech output is unavailable".into())
        })?;
        let mut lines = BufReader::new(output).lines();
        let read_events = async {
            let mut ready = false;
            loop {
                let line = if ready {
                    lines.next_line().await
                } else {
                    tokio::time::timeout(Duration::from_mins(1), lines.next_line())
                        .await
                        .map_err(|_| {
                            SttError::ConnectionFailed("Local model took too long to load".into())
                        })?
                };
                let Some(line) = line.map_err(|error| io_error(&error))? else {
                    break;
                };
                let message: WorkerEvent = serde_json::from_str(&line)
                    .map_err(|error| SttError::ParseError(error.to_string()))?;
                let event = match message {
                    WorkerEvent::Ready => {
                        ready = true;
                        TranscriptEvent::Connected
                    }
                    WorkerEvent::Partial { text } => TranscriptEvent::Partial {
                        transcript: text,
                        words: Vec::new(),
                    },
                    WorkerEvent::Final { text, start } => TranscriptEvent::Final {
                        transcript: text,
                        words: Vec::new(),
                        // Match the default for providers without confidence scores.
                        confidence: 0.9,
                        speech_final: true,
                        start_offset: Duration::try_from_secs_f64(start).ok(),
                    },
                    WorkerEvent::Error { text } => return Err(SttError::ConnectionFailed(text)),
                };
                if event_tx.send(event).await.is_err() {
                    return Ok(());
                }
            }
            let status = child.wait().await.map_err(|error| io_error(&error))?;
            if !ready || !status.success() {
                return Err(SttError::ConnectionFailed(format!(
                    "Local speech worker exited ({status}). Try downloading the model again."
                )));
            }
            let _ = event_tx.send(TranscriptEvent::Disconnected).await;
            Ok(())
        };
        let send_audio = write_audio(input, audio_rx);
        tokio::pin!(read_events, send_audio);
        tokio::select! {
            biased;
            () = wait_for_stop(&self.stopped) => Ok(()),
            result = &mut read_events => result,
            result = &mut send_audio => {
                result?;
                tokio::select! {
                    () = wait_for_stop(&self.stopped) => Ok(()),
                    result = &mut read_events => result,
                }
            }
        }
    }

    fn stop(&self) {
        self.stopped.store(true, Ordering::SeqCst);
    }

    fn name(&self) -> &'static str {
        self.model
    }
}
