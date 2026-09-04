use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use fellowshow_bible::BibleDb;
use tokio::sync::Notify;

pub struct SttSession {
    pub id: u64,
    pub cancelled: Arc<AtomicBool>,
    pub finished: Arc<Notify>,
}

pub struct AppState {
    pub bible_db: Option<BibleDb>,
    pub active_translation_id: i64,
    pub audio_active: Arc<AtomicBool>,
    pub stt_active: Arc<AtomicBool>,
    pub stt_session: Option<SttSession>,
    pub next_stt_session_id: u64,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            bible_db: None,
            active_translation_id: 0, // No translation selected until the user installs one.
            audio_active: Arc::new(AtomicBool::new(false)),
            stt_active: Arc::new(AtomicBool::new(false)),
            stt_session: None,
            next_stt_session_id: 1,
        }
    }
}
