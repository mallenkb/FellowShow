use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use fellowshow_bible::BibleDb;

pub struct AppState {
    pub bible_db: Option<BibleDb>,
    pub active_translation_id: i64,
    pub audio_active: Arc<AtomicBool>,
    pub stt_active: Arc<AtomicBool>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            bible_db: None,
            active_translation_id: 1, // Default to first translation (KJV)
            audio_active: Arc::new(AtomicBool::new(false)),
            stt_active: Arc::new(AtomicBool::new(false)),
        }
    }
}
