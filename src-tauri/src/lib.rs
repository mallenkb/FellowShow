mod bible_seed;
mod commands;
mod events;
mod semantic_assets;
mod state;

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

fn open_bible(
    app_data: Option<&Path>,
    resources: Option<&Path>,
    dev_root: Option<&Path>,
) -> Option<fellowshow_bible::BibleDb> {
    let seed = resources.and_then(|dir| {
        bundled_bible_db_candidates(dir)
            .into_iter()
            .find(|p| p.is_file())
    });
    let dev_db = dev_root.map(|root| root.join("data/fellowshow.db"));
    let working = dev_db
        .filter(|path| path.is_file() && bible_seed::validate(path).is_ok())
        .or_else(|| {
            app_data.and_then(|dir| match bible_seed::prepare(dir, seed.as_deref()) {
                Ok(path) => Some(path),
                Err(error) => {
                    log::warn!("Could not prepare writable Bible database: {error}");
                    None
                }
            })
        });
    if let Some(path) = working {
        match fellowshow_bible::BibleDb::open(&path) {
            Ok(db) => {
                log::info!("Bible database loaded from {}", path.display());
                return Some(db);
            }
            Err(error) => log::warn!("Could not open {}: {error}", path.display()),
        }
    }
    let path = seed?;
    if let Err(error) = bible_seed::validate(&path) {
        log::warn!("{error}");
        return None;
    }
    match fellowshow_bible::BibleDb::open_read_only(&path) {
        Ok(db) => {
            log::warn!("Using read-only Bible database at {}", path.display());
            Some(db)
        }
        Err(error) => {
            log::warn!("Could not open {}: {error}", path.display());
            None
        }
    }
}

fn bundled_bible_db_candidates(resource_dir: &std::path::Path) -> [std::path::PathBuf; 2] {
    [
        resource_dir.join("fellowshow.db"),
        resource_dir.join("_up_/data/fellowshow.db"),
    ]
}

#[expect(clippy::too_many_lines, reason = "app setup is inherently complex")]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file — try src-tauri/.env first, then project root ../.env
    dotenvy::dotenv().ok();
    dotenvy::from_filename("../.env").ok();
    let app = tauri::Builder::default()
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
        .on_window_event(|window, event| {
            use tauri::Manager;
            if window.label() != "main" {
                return;
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if commands::lifecycle::request_close(window.app_handle()) {
                    api.prevent_close();
                } else {
                    commands::lifecycle::shutdown_outputs(window.app_handle());
                }
            }
        })
        .manage(commands::lifecycle::AppCloseState::default())
        .manage(Mutex::new(state::AppState::new()))
        .manage(Mutex::new(fellowshow_detection::DetectionPipeline::new()))
        .manage(Mutex::new(fellowshow_broadcast::ndi::NdiRuntime::default()))
        .manage(commands::ndi_frame_clock::NdiFrameClocks::default())
        .manage(Mutex::new(fellowshow_detection::DirectDetector::new()))
        .manage(Mutex::new(fellowshow_detection::DetectionMerger::new()))
        .manage(Mutex::new(fellowshow_detection::ReadingMode::new()))
        .manage(Mutex::new(commands::remote::OscRuntime::new()))
        .manage(Mutex::new(commands::remote::HttpRuntime::new()))
        .invoke_handler(tauri::generate_handler![
            commands::lifecycle::set_app_close_guard,
            commands::lifecycle::close_app,
            commands::lifecycle::restart_app,
            commands::bible::list_translations,
            commands::bible::prepare_translation_download,
            commands::bible::cancel_translation_download,
            commands::bible::download_translation,
            commands::bible::list_books,
            commands::bible::get_chapter,
            commands::bible::get_verse,
            commands::bible::search_verses,
            commands::bible::get_cross_references,
            commands::bible::get_active_translation,
            commands::bible::set_active_translation,
            commands::detection::detect_verses,
            commands::detection::detection_status,
            commands::detection::semantic_search_status,
            commands::detection::semantic_search,
            commands::detection::search_scripture_phrases,
            commands::detection::toggle_paraphrase_detection,
            commands::detection::reading_mode_status,
            commands::detection::stop_reading_mode,
            commands::documents::prepare_presentation_document,
            commands::easyworship::find_easyworship_databases,
            commands::easyworship::import_easyworship_songs,
            commands::audio::get_audio_devices,
            commands::stt::test_deepgram_connection,
            commands::stt::test_openai_connection,
            commands::stt::test_groq_connection,
            commands::stt::start_transcription,
            commands::stt::stop_transcription,
            commands::cloud_speech_models::list_cloud_transcription_models,
            commands::model_download_cancel::cancel_transcription_model_download,
            commands::local_speech_models::list_local_speech_models,
            commands::local_speech_models::download_local_speech_model,
            commands::local_speech_models::delete_local_speech_model,
            commands::whisper_models::list_whisper_models,
            commands::whisper_models::download_whisper_model,
            commands::whisper_models::delete_whisper_model,
            commands::sermon_audio::list_sermon_audio,
            commands::sermon_audio::delete_sermon_audio,
            commands::sermon_audio::sermon_audio_formats,
            commands::sermon_audio::export_sermon_audio,
            commands::sermon_audio::export_sermon_bundle,
            commands::secrets::load_secure_settings,
            commands::secrets::save_secure_settings,
            commands::summary::summarize_preaching,
            commands::broadcast::list_monitors,
            commands::identify::identify_screens,
            commands::broadcast::ensure_broadcast_window,
            commands::broadcast::open_broadcast_window,
            commands::broadcast::close_broadcast_window,
            commands::broadcast::start_ndi,
            commands::broadcast::stop_ndi,
            commands::broadcast::get_ndi_status,
            commands::broadcast::report_broadcast_diagnostic,
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

            let app_data = app.path().app_data_dir().ok();
            let resources = app.path().resource_dir().ok();
            let dev_root = semantic_assets::development_root();
            if let Some(db) = open_bible(
                app_data.as_deref(),
                resources.as_deref(),
                dev_root.as_deref(),
            ) {
                app.state::<Mutex<state::AppState>>()
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .bible_db = Some(Arc::new(db));
            } else {
                log::warn!("Bible database unavailable");
            }

            let roots: Vec<PathBuf> = [app_data, resources, dev_root]
                .into_iter()
                .flatten()
                .collect();
            let semantic = semantic_assets::load_semantic(&roots);
            app.manage(commands::detection::SemanticSearchStatus {
                available: semantic.is_some(),
                searched_paths: roots.iter().map(|p| p.display().to_string()).collect(),
            });
            if let Some(detector) = semantic {
                app.state::<Mutex<fellowshow_detection::DetectionPipeline>>()
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .set_semantic(detector);
            }

            Ok(())
        })
        .build(tauri::generate_context!());
    match app {
        Ok(app) => app.run(|app, event| {
            #[cfg(all(dev, target_os = "macos"))]
            if matches!(event, tauri::RunEvent::Ready)
                && std::env::var_os("FELLOWSHOW_NATIVE_DEV_BUNDLE").is_some()
            {
                if let Some(main_thread) = objc2::MainThreadMarker::new() {
                    let application = objc2_app_kit::NSApplication::sharedApplication(main_thread);
                    // SAFETY: On the main thread, clear Tauri's bitmap override so the Dock reads Assets.car.
                    unsafe { application.setApplicationIconImage(None) };
                }
            }
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if commands::lifecycle::request_close(app) {
                    api.prevent_exit();
                } else {
                    commands::lifecycle::shutdown_outputs(app);
                }
            }
        }),
        Err(error) => log::error!("Could not build the Tauri application: {error}"),
    }
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
