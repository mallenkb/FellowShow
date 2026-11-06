#![expect(
    clippy::needless_pass_by_value,
    reason = "Tauri command extractors require pass-by-value"
)]

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::state::AppState;
use fellowshow_bible::{Book, CrossReference, Translation, Verse};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContentManifest {
    packs: Vec<ContentPack>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContentPack {
    translations: Vec<String>,
    path: String,
    sha256: Option<String>,
}

#[tauri::command]
pub fn list_translations(state: State<'_, Mutex<AppState>>) -> Result<Vec<Translation>, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let db = app_state
        .bible_db
        .as_ref()
        .ok_or_else(|| "Bible database not loaded".to_string())?;
    db.list_translations().map_err(|e| e.to_string())
}

/// Public base URL for downloadable Bible content — the R2 bucket's public URL
/// (e.g. `https://pub-xxxxxxxx.r2.dev`) or a custom domain in front of it.
///
/// Set this once and downloads work for every installed copy of the app. It can
/// also be provided at build time via the `FELLOWSHOW_CONTENT_BASE_URL` env var
/// (baked in below with `option_env!`), or at runtime via `.env` in development.
/// Leave empty to disable downloadable translations.
const DEFAULT_CONTENT_BASE_URL: &str = "https://pub-cb8cd9a90bf249778c9c57d72a29505f.r2.dev";

fn first_non_empty(value: &str) -> Option<String> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_string())
}

/// Resolves config from the runtime environment first (dev `.env` via dotenvy,
/// or a shell/CI variable), then a value baked in at compile time.
fn configured_manifest_url() -> Option<String> {
    std::env::var("FELLOWSHOW_CONTENT_MANIFEST_URL")
        .ok()
        .and_then(|v| first_non_empty(&v))
        .or_else(|| option_env!("FELLOWSHOW_CONTENT_MANIFEST_URL").and_then(first_non_empty))
}

fn configured_base_url() -> Option<String> {
    std::env::var("FELLOWSHOW_CONTENT_BASE_URL")
        .ok()
        .and_then(|v| first_non_empty(&v))
        .or_else(|| option_env!("FELLOWSHOW_CONTENT_BASE_URL").and_then(first_non_empty))
        .or_else(|| first_non_empty(DEFAULT_CONTENT_BASE_URL))
}

fn content_manifest_url() -> Option<String> {
    if let Some(url) = configured_manifest_url() {
        return Some(url);
    }

    let base_url = configured_base_url()?;
    let base_url = base_url.trim_end_matches('/');
    Some(format!("{base_url}/content/latest/content-manifest.json"))
}

fn resolve_pack_url(manifest_url: &str, pack_path: &str) -> Result<String, String> {
    let manifest = reqwest::Url::parse(manifest_url).map_err(|e| e.to_string())?;
    manifest
        .join(pack_path)
        .map(|url| url.to_string())
        .map_err(|e| e.to_string())
}

fn translation_pack_file_name(abbreviation: &str) -> String {
    if abbreviation.eq_ignore_ascii_case("TK") {
        "atwi.db".to_string()
    } else {
        format!("{abbreviation}.db")
    }
}

fn local_content_pack_path() -> Option<PathBuf> {
    let data_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../data");
    [
        data_dir.join("dist/fellowshow.db"),
        data_dir.join("fellowshow.db"),
    ]
    .into_iter()
    .find(|path| path.exists())
}

const DOWNLOAD_CANCELLED: &str = "Translation download cancelled";

fn install_translation_from_pack(
    state: &State<'_, Mutex<AppState>>,
    pack_path: &std::path::Path,
    abbreviation: &str,
    download_id: u64,
) -> Result<Translation, String> {
    let mut app_state = state.lock().map_err(|e| e.to_string())?;
    if !app_state.translation_downloads.contains_key(&download_id) {
        return Err(DOWNLOAD_CANCELLED.to_string());
    }
    let db = app_state
        .bible_db
        .as_ref()
        .ok_or_else(|| "Bible database not loaded".to_string())?;
    let result = db
        .install_translation_from_db(pack_path, abbreviation)
        .map_err(|e| e.to_string());
    app_state.translation_downloads.remove(&download_id);
    result
}

fn download_not_configured_error(abbreviation: &str) -> String {
    format!(
        "{abbreviation} can't be downloaded because no content source is configured. Set DEFAULT_CONTENT_BASE_URL in commands/bible.rs (or build with FELLOWSHOW_CONTENT_BASE_URL) to your R2 public URL."
    )
}

fn local_install_error(abbreviation: &str, error: String) -> String {
    if error == DOWNLOAD_CANCELLED {
        error
    } else {
        format!("Failed to install local {abbreviation} pack: {error}")
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    download_id: u64,
    abbreviation: String,
    downloaded: u64,
    total: Option<u64>,
}

fn emit_download_progress(
    app: &AppHandle,
    download_id: u64,
    abbreviation: &str,
    downloaded: u64,
    total: Option<u64>,
) {
    use tauri::Emitter;
    let _ = app.emit(
        "translation:download-progress",
        DownloadProgress {
            download_id,
            abbreviation: abbreviation.to_string(),
            downloaded,
            total,
        },
    );
}

#[tauri::command]
pub fn prepare_translation_download(state: State<'_, Mutex<AppState>>) -> Result<u64, String> {
    let mut app_state = state.lock().map_err(|e| e.to_string())?;
    prepare_download(&mut app_state)
}

fn prepare_download(app_state: &mut AppState) -> Result<u64, String> {
    let id = app_state.next_translation_download_id;
    app_state.next_translation_download_id = id
        .checked_add(1)
        .ok_or_else(|| "No translation download IDs available".to_string())?;
    let (sender, _) = tokio::sync::watch::channel(false);
    app_state.translation_downloads.insert(id, sender);
    Ok(id)
}

#[tauri::command]
pub fn cancel_translation_download(
    state: State<'_, Mutex<AppState>>,
    download_id: u64,
) -> Result<bool, String> {
    let mut app_state = state.lock().map_err(|e| e.to_string())?;
    Ok(cancel_download(&mut app_state, download_id))
}

fn cancel_download(app_state: &mut AppState, download_id: u64) -> bool {
    if let Some(sender) = app_state.translation_downloads.remove(&download_id) {
        sender.send_replace(true);
        true
    } else {
        false
    }
}

#[tauri::command]
pub async fn download_translation(
    app: AppHandle,
    state: State<'_, Mutex<AppState>>,
    abbreviation: String,
    download_id: u64,
) -> Result<Translation, String> {
    let cancelled = {
        let app_state = state.lock().map_err(|e| e.to_string())?;
        app_state
            .translation_downloads
            .get(&download_id)
            .ok_or_else(|| DOWNLOAD_CANCELLED.to_string())?
            .subscribe()
    };
    let result = run_until_cancelled(
        cancelled,
        download_translation_inner(&app, &state, &abbreviation, download_id),
    )
    .await;
    state
        .lock()
        .map_err(|e| e.to_string())?
        .translation_downloads
        .remove(&download_id);
    result
}

async fn run_until_cancelled<T>(
    mut cancelled: tokio::sync::watch::Receiver<bool>,
    operation: impl std::future::Future<Output = Result<T, String>>,
) -> Result<T, String> {
    tokio::select! {
        biased;
        _ = cancelled.changed() => Err(DOWNLOAD_CANCELLED.to_string()),
        result = operation => result,
    }
}

async fn download_translation_inner(
    app: &AppHandle,
    state: &State<'_, Mutex<AppState>>,
    abbreviation: &str,
    download_id: u64,
) -> Result<Translation, String> {
    let abbreviation = abbreviation.trim().to_uppercase();
    if abbreviation.is_empty() {
        return Err("Translation abbreviation is required".to_string());
    }

    if cfg!(debug_assertions) {
        if let Some(pack_path) = local_content_pack_path() {
            emit_download_progress(app, download_id, &abbreviation, 1, Some(1));
            return install_translation_from_pack(state, &pack_path, &abbreviation, download_id)
                .map_err(|e| local_install_error(&abbreviation, e));
        }
    }

    let Some(manifest_url) = content_manifest_url() else {
        if let Some(pack_path) = local_content_pack_path() {
            return install_translation_from_pack(state, &pack_path, &abbreviation, download_id)
                .map_err(|e| {
                    if e == DOWNLOAD_CANCELLED {
                        e
                    } else {
                        download_not_configured_error(&abbreviation)
                    }
                });
        }

        return Err(download_not_configured_error(&abbreviation));
    };
    let client = reqwest::Client::new();
    let manifest = client
        .get(&manifest_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch content manifest: {e}"))?
        .error_for_status()
        .map_err(|e| format!("Content manifest request failed: {e}"))?
        .json::<ContentManifest>()
        .await
        .map_err(|e| format!("Failed to parse content manifest: {e}"))?;

    let pack = manifest
        .packs
        .iter()
        .find(|pack| {
            pack.translations
                .iter()
                .any(|translation| translation.eq_ignore_ascii_case(&abbreviation))
        })
        .ok_or_else(|| format!("{abbreviation} is not available in the content manifest"))?;

    let pack_url = resolve_pack_url(&manifest_url, &pack.path)?;
    let mut response = client
        .get(&pack_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download {abbreviation}: {e}"))?
        .error_for_status()
        .map_err(|e| format!("Download request failed for {abbreviation}: {e}"))?;

    // Stream the pack so the UI can show real download progress.
    let total = response.content_length();
    let mut downloaded: u64 = 0;
    let mut bytes: Vec<u8> = Vec::with_capacity(usize::try_from(total.unwrap_or(0)).unwrap_or(0));
    let mut last_emit = std::time::Instant::now();
    emit_download_progress(app, download_id, &abbreviation, 0, total);
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("Failed while downloading {abbreviation}: {e}"))?
    {
        bytes.extend_from_slice(&chunk);
        downloaded += chunk.len() as u64;
        if last_emit.elapsed() >= std::time::Duration::from_millis(100) {
            last_emit = std::time::Instant::now();
            emit_download_progress(app, download_id, &abbreviation, downloaded, total);
        }
    }
    emit_download_progress(app, download_id, &abbreviation, downloaded, total);

    if let Some(expected_sha) = pack.sha256.as_deref() {
        let actual_sha = {
            use sha2::{Digest, Sha256};
            let mut hasher = Sha256::new();
            hasher.update(&bytes);
            format!("{:x}", hasher.finalize())
        };
        if !actual_sha.eq_ignore_ascii_case(expected_sha) {
            return Err(format!(
                "Downloaded {abbreviation} pack failed integrity check"
            ));
        }
    }

    let content_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?
        .join("content");
    std::fs::create_dir_all(&content_dir)
        .map_err(|e| format!("Failed to create content directory: {e}"))?;
    let pack_path = content_dir.join(translation_pack_file_name(&abbreviation));
    std::fs::write(&pack_path, bytes)
        .map_err(|e| format!("Failed to save downloaded {abbreviation} pack: {e}"))?;

    install_translation_from_pack(state, &pack_path, &abbreviation, download_id)
}

#[tauri::command]
pub fn list_books(
    state: State<'_, Mutex<AppState>>,
    translation_id: i64,
) -> Result<Vec<Book>, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let db = app_state
        .bible_db
        .as_ref()
        .ok_or_else(|| "Bible database not loaded".to_string())?;
    db.list_books(translation_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_chapter(
    state: State<'_, Mutex<AppState>>,
    translation_id: i64,
    book_number: i32,
    chapter: i32,
) -> Result<Vec<Verse>, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let db = app_state
        .bible_db
        .as_ref()
        .ok_or_else(|| "Bible database not loaded".to_string())?;
    db.get_chapter(translation_id, book_number, chapter)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_verse(
    state: State<'_, Mutex<AppState>>,
    translation_id: i64,
    book_number: i32,
    chapter: i32,
    verse: i32,
) -> Result<Option<Verse>, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let db = app_state
        .bible_db
        .as_ref()
        .ok_or_else(|| "Bible database not loaded".to_string())?;
    db.get_verse(translation_id, book_number, chapter, verse)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_verses(
    state: State<'_, Mutex<AppState>>,
    query: String,
    translation_id: i64,
    limit: usize,
) -> Result<Vec<Verse>, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let db = app_state
        .bible_db
        .as_ref()
        .ok_or_else(|| "Bible database not loaded".to_string())?;
    db.search_verses(&query, translation_id, limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_cross_references(
    state: State<'_, Mutex<AppState>>,
    book_number: i32,
    chapter: i32,
    verse: i32,
) -> Result<Vec<CrossReference>, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    let db = app_state
        .bible_db
        .as_ref()
        .ok_or_else(|| "Bible database not loaded".to_string())?;
    db.get_cross_references(book_number, chapter, verse)
        .map_err(|e| e.to_string())
}

/// Get the active translation ID
#[tauri::command]
pub fn get_active_translation(state: State<'_, Mutex<AppState>>) -> Result<i64, String> {
    let app_state = state.lock().map_err(|e| e.to_string())?;
    Ok(app_state.active_translation_id)
}

/// Set the active translation by ID
#[tauri::command]
pub fn set_active_translation(
    app: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
    translation_id: i64,
) -> Result<i64, String> {
    let mut app_state = state.lock().map_err(|e| e.to_string())?;
    if translation_id == 0 {
        app_state.active_translation_id = 0;
        log::info!("[BIBLE] Active translation cleared");
        return Ok(0);
    }
    if app_state.active_translation_id == translation_id {
        return Ok(translation_id);
    }

    // Verify the translation exists and has verse content installed.
    if let Some(ref db) = app_state.bible_db {
        let translations = db.list_translations().map_err(|e| e.to_string())?;
        let Some(translation) = translations.iter().find(|t| t.id == translation_id) else {
            return Err(format!("Translation ID {translation_id} not found"));
        };
        if !translation.is_downloaded {
            return Err(format!("{} is not downloaded", translation.abbreviation));
        }
    }
    app_state.active_translation_id = translation_id;
    drop(app_state);
    super::stt::refresh_reading_translation(&app, translation_id);
    log::info!("[BIBLE] Active translation set to ID {translation_id}");
    Ok(translation_id)
}

#[cfg(test)]
mod download_tests {
    use super::{cancel_download, prepare_download, run_until_cancelled, DOWNLOAD_CANCELLED};
    use crate::state::AppState;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;

    #[test]
    fn cancelling_a_prepared_download_invalidates_only_its_own_ticket() {
        let mut state = AppState::new();
        let first = prepare_download(&mut state).unwrap();
        let second = prepare_download(&mut state).unwrap();

        assert!(cancel_download(&mut state, first));
        assert!(!cancel_download(&mut state, first));
        assert!(!state.translation_downloads.contains_key(&first));
        assert!(state.translation_downloads.contains_key(&second));
    }

    #[tokio::test]
    async fn cancellation_drops_a_pending_transfer() {
        struct TransferGuard(Arc<AtomicBool>);
        impl Drop for TransferGuard {
            fn drop(&mut self) {
                self.0.store(true, Ordering::SeqCst);
            }
        }

        let mut state = AppState::new();
        let id = prepare_download(&mut state).unwrap();
        let receiver = state.translation_downloads[&id].subscribe();
        let dropped = Arc::new(AtomicBool::new(false));
        let guard = TransferGuard(Arc::clone(&dropped));
        let transfer = async move {
            let _guard = guard;
            std::future::pending::<Result<(), String>>().await
        };
        let task = tokio::spawn(run_until_cancelled(receiver, transfer));
        tokio::task::yield_now().await;

        assert!(cancel_download(&mut state, id));
        assert_eq!(task.await.unwrap(), Err(DOWNLOAD_CANCELLED.to_string()));
        assert!(dropped.load(Ordering::SeqCst));
    }

    #[tokio::test]
    async fn a_completed_transfer_returns_its_result() {
        let (_sender, receiver) = tokio::sync::watch::channel(false);
        let result = run_until_cancelled(receiver, async { Ok::<_, String>(42) }).await;
        assert_eq!(result, Ok(42));
    }
}
