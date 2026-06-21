mod commands;
mod events;
mod state;

use std::sync::Mutex;

/// Resolves a writable path to the working Bible database.
///
/// In release builds the bundled DB ships in a read-only resource directory, but
/// installing a downloaded translation writes to the DB. So we seed a writable
/// copy in the app data directory on first run and use that thereafter (which
/// also preserves any translations the user has already downloaded).
fn resolve_working_db_path<R: tauri::Runtime>(
    app: &tauri::App<R>,
    dev_data_dir: &std::path::Path,
) -> Option<std::path::PathBuf> {
    use tauri::Manager;

    // Development: use the repo DB directly so rebuilds are picked up and writes persist.
    if cfg!(debug_assertions) {
        let dev_db = dev_data_dir.join("fellowshow.db");
        if dev_db.exists() {
            return Some(dev_db);
        }
    }

    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let working = app_data_dir.join("fellowshow.db");
        if working.exists() {
            return Some(working);
        }

        if let Ok(resource_dir) = app.path().resource_dir() {
            if let Some(seed) = bundled_bible_db_candidates(&resource_dir)
                .into_iter()
                .find(|path| path.exists())
            {
                match std::fs::create_dir_all(&app_data_dir)
                    .and_then(|()| std::fs::copy(&seed, &working))
                {
                    Ok(_) => {
                        log::info!("Seeded writable Bible database at {}", working.display());
                        return Some(working);
                    }
                    Err(e) => {
                        log::warn!(
                            "Failed to seed writable Bible database ({e}); using read-only bundle"
                        );
                        return Some(seed);
                    }
                }
            }
        }
    }

    let dev_db = dev_data_dir.join("fellowshow.db");
    dev_db.exists().then_some(dev_db)
}

fn bundled_bible_db_candidates(resource_dir: &std::path::Path) -> [std::path::PathBuf; 2] {
    [
        resource_dir.join("fellowshow.db"),
        resource_dir.join("_up_/data/fellowshow.db"),
    ]
}

#[cfg(test)]
mod tests {
    use super::bundled_bible_db_candidates;

    #[test]
    fn includes_tauri_preserved_relative_resource_path() {
        let candidates = bundled_bible_db_candidates(std::path::Path::new("/Resources"));

        assert_eq!(
            candidates[0],
            std::path::Path::new("/Resources/fellowshow.db")
        );
        assert_eq!(
            candidates[1],
            std::path::Path::new("/Resources/_up_/data/fellowshow.db")
        );
    }
}

#[expect(clippy::too_many_lines, reason = "app setup is inherently complex")]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file — try src-tauri/.env first, then project root ../.env
    dotenvy::dotenv().ok();
    dotenvy::from_filename("../.env").ok();
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(state::AppState::new()))
        .manage(Mutex::new(fellowshow_detection::DetectionPipeline::new()))
        .manage(Mutex::new(fellowshow_broadcast::ndi::NdiRuntime::default()))
        .manage(Mutex::new(fellowshow_detection::DirectDetector::new()))
        .manage(Mutex::new(fellowshow_detection::DetectionMerger::new()))
        .manage(Mutex::new(fellowshow_detection::ReadingMode::new()))
        .manage(Mutex::new(commands::remote::OscRuntime::new()))
        .manage(Mutex::new(commands::remote::HttpRuntime::new()))
        .invoke_handler(tauri::generate_handler![
            commands::bible::list_translations,
            commands::bible::download_translation,
            commands::bible::list_books,
            commands::bible::get_chapter,
            commands::bible::get_verse,
            commands::bible::search_verses,
            commands::bible::get_translation_verses_for_search,
            commands::bible::get_cross_references,
            commands::bible::get_active_translation,
            commands::bible::set_active_translation,
            commands::detection::detect_verses,
            commands::detection::detection_status,
            commands::detection::semantic_search,
            commands::detection::toggle_paraphrase_detection,
            commands::detection::reading_mode_status,
            commands::detection::stop_reading_mode,
            commands::audio::get_audio_devices,
            commands::stt::test_deepgram_connection,
            commands::stt::test_openai_connection,
            commands::stt::test_groq_connection,
            commands::stt::start_transcription,
            commands::stt::stop_transcription,
            commands::broadcast::list_monitors,
            commands::broadcast::ensure_broadcast_window,
            commands::broadcast::open_broadcast_window,
            commands::broadcast::close_broadcast_window,
            commands::broadcast::start_ndi,
            commands::broadcast::stop_ndi,
            commands::broadcast::get_ndi_status,
            commands::broadcast::push_ndi_frame,
            commands::remote::start_osc,
            commands::remote::stop_osc,
            commands::remote::get_osc_status,
            commands::remote::start_http,
            commands::remote::stop_http,
            commands::remote::get_http_status,
            commands::remote::update_remote_status,
        ])
        .setup(|app| {
            use tauri::Manager;

            let dev_data_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../data");
            let db_path = resolve_working_db_path(app, &dev_data_dir);

            if let Some(db_path) = db_path {
                let bible_db = fellowshow_bible::BibleDb::open(&db_path)
                    .expect("Failed to open Bible database");

                let managed_state = app.state::<Mutex<state::AppState>>();
                let mut state = managed_state.lock().unwrap();
                if let Ok(Some(nkjv_id)) = bible_db.get_translation_id_by_abbreviation("NKJV") {
                    state.active_translation_id = nkjv_id;
                }
                state.bible_db = Some(bible_db);
                drop(state);
                log::info!("Bible database loaded from {}", db_path.display());
            } else {
                log::warn!(
                    "Bible database not found (looked in app data dir, bundled resources, and {}).",
                    dev_data_dir.display()
                );
            }

            // Try to load ONNX embedding model and pre-computed verse index
            // Prefer INT8 quantized model (~571MB) over FP32 (~2.4GB)
            let base_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
            let model_path = {
                let int8 = base_dir.join("models/qwen3-embedding-0.6b-int8/model_quantized.onnx");
                let fp32 = base_dir.join("models/qwen3-embedding-0.6b/model.onnx");
                if int8.exists() {
                    log::info!("Using INT8 quantized ONNX model");
                    int8
                } else if fp32.exists() {
                    log::info!("Using FP32 ONNX model (INT8 not found)");
                    fp32
                } else {
                    fp32
                }
            };
            let tokenizer_path = base_dir.join("models/qwen3-embedding-0.6b/tokenizer.json");
            let embeddings_path = base_dir.join("embeddings/kjv-qwen3-0.6b.bin");
            let ids_path = base_dir.join("embeddings/kjv-qwen3-0.6b-ids.bin");

            if model_path.exists() && tokenizer_path.exists() {
                use fellowshow_detection::semantic::embedder::TextEmbedder;
                use fellowshow_detection::semantic::index::VectorIndex;
                match fellowshow_detection::OnnxEmbedder::load(&model_path, &tokenizer_path) {
                    Ok(embedder) => {
                        log::info!("ONNX embedding model loaded");
                        let managed_pipeline = app.state::<Mutex<fellowshow_detection::DetectionPipeline>>();
                        let mut pipeline = managed_pipeline.lock().unwrap();

                        // If pre-computed embeddings exist, load the vector index
                        if embeddings_path.exists() && ids_path.exists() {
                            let dim = embedder.dimension();
                            match fellowshow_detection::HnswVectorIndex::load(&embeddings_path, &ids_path, dim) {
                                Ok(index) => {
                                    log::info!("Verse embeddings loaded ({} vectors)", index.len());
                                    pipeline.set_semantic(
                                        fellowshow_detection::SemanticDetector::new(
                                            Box::new(embedder),
                                            Box::new(index),
                                        ),
                                    );
                                }
                                Err(e) => {
                                    log::warn!("Failed to load verse embeddings: {e}");
                                }
                            }
                        } else {
                            log::info!("No pre-computed verse embeddings found. Run 'bun run export:verses' then the precompute binary.");
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to load ONNX model: {e}");
                    }
                }
            } else {
                log::info!("ONNX model not found. Semantic search disabled. Run 'bun run download:model' to download.");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
