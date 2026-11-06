use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use tauri::{Emitter, Manager};

#[derive(Default)]
pub struct AppCloseState {
    guarded: AtomicBool,
}

#[tauri::command]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri injects an owned AppHandle into commands"
)]
pub fn set_app_close_guard(app: tauri::AppHandle, enabled: bool) {
    app.state::<AppCloseState>()
        .guarded
        .store(enabled, Ordering::Relaxed);
}

#[tauri::command]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri injects an owned AppHandle into commands"
)]
pub fn close_app(app: tauri::AppHandle) {
    app.state::<AppCloseState>()
        .guarded
        .store(false, Ordering::Relaxed);
    app.exit(0);
}

/// Ask the operator UI to save before either window close or native Quit.
pub fn request_close(app: &tauri::AppHandle) -> bool {
    if !app.state::<AppCloseState>().guarded.load(Ordering::Relaxed) {
        return false;
    }
    if let Err(error) = app.emit_to("main", "app:close-requested", ()) {
        log::error!("Could not request a safe app close: {error}");
    }
    true
}

/// Stop outputs only after closing has been approved, so cancelling keeps Live intact.
pub fn shutdown_outputs(app: &tauri::AppHandle) {
    if let Some(clocks) = app.try_state::<super::ndi_frame_clock::NdiFrameClocks>() {
        if let Err(error) = clocks.stop_all() {
            log::warn!("Failed to stop NDI frame clocks during app close: {error}");
        }
    }
    if let Some(runtime) = app.try_state::<Mutex<fellowshow_broadcast::ndi::NdiRuntime>>() {
        runtime
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .stop_all();
    }
    for (label, webview) in app.webview_windows() {
        if label.starts_with("broadcast") {
            if let Err(error) = webview.close() {
                log::warn!("Failed to close {label} during app close: {error}");
            }
        }
    }
}
