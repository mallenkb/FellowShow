#![expect(
    clippy::needless_pass_by_value,
    reason = "Tauri command extractors require pass-by-value"
)]

use std::collections::HashSet;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use fellowshow_detection::{DetectionPipeline, MergedDetection, ReadingMode};

use crate::state::AppState;

/// Confidence assigned to the best FTS5 BM25 match (rank 0) in context search.
pub(crate) const FTS5_RANK0_CONFIDENCE: f64 = 0.86;

/// Confidence decrease per FTS5 rank position.
pub(crate) const FTS5_CONFIDENCE_DECAY: f64 = 0.04;

/// FTS5 results below this confidence are not included.
pub(crate) const FTS5_MIN_CONFIDENCE: f64 = 0.50;

/// Serializable detection result for the frontend
#[derive(Clone, Serialize)]
pub struct DetectionResult {
    pub verse_ref: String,
    pub verse_text: String,
    pub book_name: String,
    pub book_number: i32,
    pub chapter: i32,
    pub verse: i32,
    pub confidence: f64,
    pub source: String,
    pub auto_queued: bool,
    pub transcript_snippet: String,
    /// True when detected from a chapter-only reference (verse defaults to 1, may be refined).
    pub is_chapter_only: bool,
}

fn source_to_string(source: &fellowshow_detection::DetectionSource) -> String {
    match source {
        fellowshow_detection::DetectionSource::DirectReference => "direct".to_string(),
        fellowshow_detection::DetectionSource::Semantic { .. } => "semantic".to_string(),
    }
}

/// Resolve a detection to a full verse result using the database.
///
/// Resolution order:
/// 1. By `verse_id` (semantic detections with DB primary key)
/// 2. By `book_number/chapter/verse_start` with active translation (direct + FTS5 detections)
/// 3. Preserve an unresolved suggestion without auto-queueing when the database is unavailable.
///
/// References absent from an available active translation are discarded.
pub fn to_result(state: &AppState, merged: &MergedDetection) -> Option<DetectionResult> {
    let vr = &merged.detection.verse_ref;
    let vid = merged.detection.verse_id;

    let resolved = if let Some(db) = &state.bible_db {
        // Try verse_id first (vector-based semantic detections)
        let by_id = vid.and_then(|id| db.get_verse_by_id(id).ok().flatten());
        // Fall back to book/chapter/verse lookup (direct + FTS5 detections)
        if by_id.is_some() {
            by_id
        } else if state.active_translation_id > 0 {
            match db.get_verse(
                state.active_translation_id,
                vr.book_number,
                vr.chapter,
                vr.verse_start,
            ) {
                Ok(Some(verse)) => Some(verse),
                Ok(None) => return None,
                Err(error) => {
                    log::warn!("Could not resolve detected Bible reference: {error}");
                    None
                }
            }
        } else {
            None
        }
    } else {
        None
    };
    let has_verse_text = resolved.is_some();

    let (reference, verse_text, book_name, book_number, chapter, verse) = if let Some(v) = resolved
    {
        let r = format!("{} {}:{}", v.book_name, v.chapter, v.verse);
        (r, v.text, v.book_name, v.book_number, v.chapter, v.verse)
    } else {
        let r = format!("{} {}:{}", vr.book_name, vr.chapter, vr.verse_start);
        (
            r,
            String::new(),
            vr.book_name.clone(),
            vr.book_number,
            vr.chapter,
            vr.verse_start,
        )
    };

    Some(DetectionResult {
        verse_ref: reference,
        verse_text,
        book_name,
        book_number,
        chapter,
        verse,
        confidence: merged.detection.confidence,
        source: source_to_string(&merged.detection.source),
        auto_queued: merged.auto_queued && has_verse_text,
        transcript_snippet: merged.detection.transcript_snippet.clone(),
        is_chapter_only: merged.detection.is_chapter_only,
    })
}

/// Run the detection pipeline on a piece of transcript text
#[tauri::command]
pub fn detect_verses(
    state: State<'_, Mutex<AppState>>,
    pipeline_state: State<'_, Mutex<DetectionPipeline>>,
    text: String,
) -> Result<Vec<DetectionResult>, String> {
    let merged = {
        let mut pipeline = pipeline_state.lock().map_err(|e| e.to_string())?;
        pipeline.process(&text)
    };
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let results: Vec<DetectionResult> = merged
        .iter()
        .filter_map(|m| to_result(&app_state, m))
        .collect();
    Ok(results)
}

/// Check if semantic search is available
#[tauri::command]
pub fn detection_status(
    pipeline_state: State<'_, Mutex<DetectionPipeline>>,
) -> Result<DetectionStatusResult, String> {
    let pipeline = pipeline_state.lock().map_err(|e| e.to_string())?;
    Ok(DetectionStatusResult {
        has_direct: true,
        has_semantic: pipeline.has_semantic(),
        paraphrase_enabled: pipeline.use_synonyms(),
    })
}

/// Toggle paraphrase detection (synonym expansion) on/off
#[tauri::command]
pub fn toggle_paraphrase_detection(
    pipeline_state: State<'_, Mutex<DetectionPipeline>>,
    enabled: bool,
) -> Result<bool, String> {
    let mut pipeline = pipeline_state.lock().map_err(|e| e.to_string())?;
    pipeline.set_use_synonyms(enabled);
    log::info!("[DET] Paraphrase detection (synonyms) set to: {enabled}");
    Ok(enabled)
}

#[derive(Serialize)]
pub struct DetectionStatusResult {
    pub has_direct: bool,
    pub has_semantic: bool,
    pub paraphrase_enabled: bool,
}

#[derive(Serialize)]
pub struct SemanticSearchResult {
    pub verse_ref: String,
    pub verse_text: String,
    pub book_name: String,
    pub book_number: i32,
    pub chapter: i32,
    pub verse: i32,
    pub similarity: f64,
}

#[tauri::command]
pub async fn search_scripture_phrases(
    app: AppHandle,
    query: String,
    translation_id: i64,
    limit: Option<usize>,
) -> Result<Vec<SemanticSearchResult>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        search_scripture_phrases_inner(app.state(), query, translation_id, limit)
    })
    .await
    .map_err(|e| format!("Scripture search worker failed: {e}"))?
}

fn search_scripture_phrases_inner(
    state: State<'_, Mutex<AppState>>,
    query: String,
    translation_id: i64,
    limit: Option<usize>,
) -> Result<Vec<SemanticSearchResult>, String> {
    if query.trim().chars().count() < 2 || !query.chars().any(char::is_alphanumeric) {
        return Ok(Vec::new());
    }
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let db = app_state
        .bible_db
        .as_ref()
        .ok_or("Bible database not loaded")?;
    let query: String = query.chars().take(500).collect();
    let matches = db
        .search_verses_bm25_including_translation(
            &query,
            limit.unwrap_or(15).clamp(1, 50),
            Some(translation_id),
        )
        .map_err(|e| format!("Scripture phrase search failed: {e}"))?;
    let mut results = Vec::with_capacity(matches.len());
    for (rank, found) in matches.into_iter().enumerate() {
        if let Some(v) = db
            .get_verse(
                translation_id,
                found.book_number,
                found.chapter,
                found.verse,
            )
            .map_err(|e| format!("Could not resolve scripture in selected translation: {e}"))?
        {
            let rank = u32::try_from(rank).map_err(|e| e.to_string())?;
            results.push(SemanticSearchResult {
                verse_ref: format!("{} {}:{}", v.book_name, v.chapter, v.verse),
                verse_text: v.text,
                book_name: v.book_name,
                book_number: v.book_number,
                chapter: v.chapter,
                verse: v.verse,
                similarity: (0.98 - f64::from(rank) * 0.025).max(0.5),
            });
        }
    }
    Ok(results)
}

#[tauri::command]
pub async fn semantic_search(
    app: AppHandle,
    query: String,
    limit: Option<usize>,
    translation_id: Option<i64>,
) -> Result<Vec<SemanticSearchResult>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        semantic_search_inner(app.state(), app.state(), query, limit, translation_id)
    })
    .await
    .map_err(|e| format!("Meaning search worker failed: {e}"))?
}

fn semantic_search_inner(
    state: State<'_, Mutex<AppState>>,
    pipeline_state: State<'_, Mutex<DetectionPipeline>>,
    query: String,
    limit: Option<usize>,
    translation_id: Option<i64>,
) -> Result<Vec<SemanticSearchResult>, String> {
    let k = limit.unwrap_or(10).clamp(1, 50);
    let query: String = query.chars().take(500).collect();

    // Lock pipeline for vector search (may be slow if ONNX runs)
    let vector_results = {
        let mut pipeline = pipeline_state.lock().map_err(|e| e.to_string())?;
        if !pipeline.has_semantic() {
            return Err("Semantic search not available — model or embeddings not loaded".into());
        }
        pipeline.semantic_search(&query, k)
    }; // Pipeline lock dropped

    // Lock AppState for DB lookups only (fast)
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let translation_id = translation_id.unwrap_or(app_state.active_translation_id);

    let mut results: Vec<SemanticSearchResult> = vector_results
        .into_iter()
        .filter_map(|(verse_id, similarity)| {
            if let Some(ref db) = app_state.bible_db {
                if let Ok(Some(v)) = db.get_verse_by_id(verse_id) {
                    let Ok(Some(v)) =
                        db.get_verse(translation_id, v.book_number, v.chapter, v.verse)
                    else {
                        return None;
                    };
                    return Some(SemanticSearchResult {
                        verse_ref: format!("{} {}:{}", v.book_name, v.chapter, v.verse),
                        verse_text: v.text,
                        book_name: v.book_name,
                        book_number: v.book_number,
                        chapter: v.chapter,
                        verse: v.verse,
                        similarity,
                    });
                }
            }
            None
        })
        .collect();

    // FTS5 BM25 across all English translations — resolve to active translation
    if let Some(ref db) = app_state.bible_db {
        let fts_results = db.search_verses_bm25(&query, k).unwrap_or_default();
        let mut seen: HashSet<(i32, i32, i32)> = results
            .iter()
            .map(|r| (r.book_number, r.chapter, r.verse))
            .collect();

        for (rank, fts) in fts_results.iter().enumerate() {
            if seen.insert((fts.book_number, fts.chapter, fts.verse)) {
                #[expect(clippy::cast_precision_loss, reason = "rank is small")]
                let similarity = FTS5_RANK0_CONFIDENCE - (rank as f64 * FTS5_CONFIDENCE_DECAY);
                if similarity < FTS5_MIN_CONFIDENCE {
                    break;
                }
                // Resolve to active translation text
                if let Ok(Some(v)) =
                    db.get_verse(translation_id, fts.book_number, fts.chapter, fts.verse)
                {
                    results.push(SemanticSearchResult {
                        verse_ref: format!("{} {}:{}", v.book_name, v.chapter, v.verse),
                        verse_text: v.text,
                        book_name: v.book_name,
                        book_number: v.book_number,
                        chapter: v.chapter,
                        verse: v.verse,
                        similarity,
                    });
                }
            }
        }
    }

    // Ensure highest similarity is always first
    results.sort_by(|a, b| {
        b.similarity
            .partial_cmp(&a.similarity)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    results.truncate(k);
    Ok(results)
}

/// Get reading mode status
#[tauri::command]
pub fn reading_mode_status(
    state: State<'_, Mutex<ReadingMode>>,
) -> Result<ReadingModeStatus, String> {
    let rm = state.lock().map_err(|e| e.to_string())?;
    Ok(ReadingModeStatus {
        active: rm.is_active(),
        current_verse: rm.current_verse(),
    })
}

#[derive(Serialize)]
pub struct ReadingModeStatus {
    pub active: bool,
    pub current_verse: Option<i32>,
}

/// Stop reading mode
#[tauri::command]
pub fn stop_reading_mode(state: State<'_, Mutex<ReadingMode>>) -> Result<(), String> {
    let mut rm = state.lock().map_err(|e| e.to_string())?;
    rm.deactivate();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::to_result;
    use crate::state::AppState;
    use fellowshow_bible::BibleDb;
    use fellowshow_detection::{Detection, DetectionSource, MergedDetection, VerseRef};

    fn detection(book_number: i32, book_name: &str, chapter: i32, verse: i32) -> MergedDetection {
        MergedDetection {
            detection: Detection {
                verse_ref: VerseRef {
                    book_number,
                    book_name: book_name.to_string(),
                    chapter,
                    verse_start: verse,
                    verse_end: None,
                },
                verse_id: None,
                confidence: 0.95,
                source: DetectionSource::DirectReference,
                transcript_snippet: "synthetic test transcript".to_string(),
                detected_at: 1,
                is_chapter_only: false,
            },
            auto_queued: true,
        }
    }

    fn database_state() -> (tempfile::TempDir, AppState) {
        let directory = tempfile::tempdir().expect("create database directory");
        let path = directory.path().join("bible.db");
        let connection = rusqlite::Connection::open(&path).expect("create database");
        connection.execute_batch(
            "CREATE TABLE verses (id INTEGER PRIMARY KEY, translation_id INTEGER, book_number INTEGER, book_name TEXT, book_abbreviation TEXT, chapter INTEGER, verse INTEGER, text TEXT);
             INSERT INTO verses VALUES (1, 1, 43, 'John', 'Jn', 3, 16, 'For God so loved the world');
             INSERT INTO verses VALUES (2, 1, 22, 'Song of Solomon', 'Song', 3, 11, 'Song chapter three ends here');"
        ).expect("create fixture verses");
        drop(connection);
        let mut state = AppState::new();
        state.active_translation_id = 1;
        state.bible_db = Some(BibleDb::open(&path).expect("open Bible database"));
        (directory, state)
    }

    #[test]
    fn nonexistent_verses_do_not_reach_the_operator_queue() {
        let (_directory, state) = database_state();
        assert!(to_result(&state, &detection(22, "Song of Solomon", 3, 16)).is_none());
    }

    #[test]
    fn existing_verses_keep_their_text_and_auto_queue_flag() {
        let (_directory, state) = database_state();
        let result = to_result(&state, &detection(43, "John", 3, 16)).expect("existing verse");
        assert_eq!(result.verse_text, "For God so loved the world");
        assert!(result.auto_queued);
    }

    #[test]
    fn unavailable_database_preserves_an_unqueued_suggestion() {
        let result = to_result(&AppState::new(), &detection(43, "John", 3, 16))
            .expect("unresolved suggestion");
        assert_eq!(result.verse_ref, "John 3:16");
        assert!(!result.auto_queued);
    }

    #[test]
    fn a_database_lookup_error_preserves_an_unqueued_suggestion() {
        let (directory, state) = database_state();
        let connection = rusqlite::Connection::open(directory.path().join("bible.db"))
            .expect("open fixture database");
        connection
            .execute("DROP TABLE verses", [])
            .expect("simulate unavailable verse data");
        let result =
            to_result(&state, &detection(43, "John", 3, 16)).expect("unresolved suggestion");
        assert_eq!(result.verse_ref, "John 3:16");
        assert!(!result.auto_queued);
    }
}
