use std::{future::Future, sync::Mutex};

use serde::Deserialize;
use tokio::sync::oneshot;

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TranscriptionModelKind {
    Whisper,
    LocalSpeech,
}

impl TranscriptionModelKind {
    fn sender(self) -> &'static Mutex<Option<oneshot::Sender<()>>> {
        static WHISPER: Mutex<Option<oneshot::Sender<()>>> = Mutex::new(None);
        static LOCAL_SPEECH: Mutex<Option<oneshot::Sender<()>>> = Mutex::new(None);
        match self {
            Self::Whisper => &WHISPER,
            Self::LocalSpeech => &LOCAL_SPEECH,
        }
    }
}

struct Reset(TranscriptionModelKind);

impl Drop for Reset {
    fn drop(&mut self) {
        if let Ok(mut slot) = self.0.sender().lock() {
            *slot = None;
        }
    }
}

/// The caller holds its model family's install lock until this future ends.
pub(super) async fn cancellable_download(
    kind: TranscriptionModelKind,
    download: impl Future<Output = Result<(), String>>,
) -> Result<(), String> {
    let (sender, cancel) = oneshot::channel();
    *kind.sender().lock().map_err(|error| error.to_string())? = Some(sender);
    let _reset = Reset(kind);
    tokio::select! {
        biased;
        result = download => result,
        _ = cancel => Err("Model download canceled.".into()),
    }
}

#[tauri::command]
pub fn cancel_transcription_model_download(kind: TranscriptionModelKind) -> Result<bool, String> {
    let sender = kind
        .sender()
        .lock()
        .map_err(|error| error.to_string())?
        .take();
    Ok(sender.is_some_and(|sender| sender.send(()).is_ok()))
}
