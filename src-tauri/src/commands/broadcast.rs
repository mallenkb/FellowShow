#![expect(
    clippy::needless_pass_by_value,
    reason = "Tauri command extractors require pass-by-value"
)]

use std::sync::Mutex;

use base64::Engine;
use fellowshow_broadcast::ndi::{NdiRuntime, NdiSessionInfo, NdiStartRequest};
use serde::{Deserialize, Serialize};
use tauri::webview::PageLoadEvent;
use tauri::State;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// Map `output_id` ("main" | "alt") to Tauri window label.
fn window_label(output_id: &str) -> &'static str {
    match output_id {
        "alt" => "broadcast-alt",
        _ => "broadcast",
    }
}

/// Map `output_id` to broadcast-output.html URL with query param.
fn window_url(output_id: &str) -> String {
    format!("broadcast-output.html?output={output_id}")
}

trait ProjectorWindowOps {
    fn set_decorations(&self, decorations: bool) -> Result<(), String>;
    fn set_fullscreen(&self, fullscreen: bool) -> Result<(), String>;
    fn set_skip_taskbar(&self, skip: bool) -> Result<(), String>;
    fn set_physical_position(&self, position: tauri::PhysicalPosition<i32>) -> Result<(), String>;
    fn set_physical_size(&self, size: tauri::PhysicalSize<u32>) -> Result<(), String>;
    fn maximize(&self) -> Result<(), String>;
    fn show(&self) -> Result<(), String>;
    fn set_focus(&self) -> Result<(), String>;
}

impl ProjectorWindowOps for tauri::WebviewWindow {
    fn set_decorations(&self, decorations: bool) -> Result<(), String> {
        self.set_decorations(decorations).map_err(|e| e.to_string())
    }

    fn set_fullscreen(&self, fullscreen: bool) -> Result<(), String> {
        self.set_fullscreen(fullscreen).map_err(|e| e.to_string())
    }

    fn set_skip_taskbar(&self, skip: bool) -> Result<(), String> {
        self.set_skip_taskbar(skip).map_err(|e| e.to_string())
    }

    fn set_physical_position(&self, position: tauri::PhysicalPosition<i32>) -> Result<(), String> {
        self.set_position(tauri::Position::Physical(position))
            .map_err(|e| e.to_string())
    }

    fn set_physical_size(&self, size: tauri::PhysicalSize<u32>) -> Result<(), String> {
        self.set_size(tauri::Size::Physical(size))
            .map_err(|e| e.to_string())
    }

    fn maximize(&self) -> Result<(), String> {
        self.maximize().map_err(|e| e.to_string())
    }

    fn show(&self) -> Result<(), String> {
        self.show().map_err(|e| e.to_string())
    }

    fn set_focus(&self) -> Result<(), String> {
        self.set_focus().map_err(|e| e.to_string())
    }
}

fn show_projector_window(
    window: &impl ProjectorWindowOps,
    position: tauri::PhysicalPosition<i32>,
    size: tauri::PhysicalSize<u32>,
) -> Result<(), String> {
    window.set_fullscreen(false)?;
    window.set_decorations(true)?;
    window.set_skip_taskbar(false)?;
    window.set_physical_position(position)?;
    window.set_physical_size(size)?;
    window.maximize()?;
    window.show()?;
    window.set_focus()?;
    Ok(())
}

fn show_projector_window_on_monitor(
    window: &impl ProjectorWindowOps,
    monitor: &tauri::Monitor,
) -> Result<(), String> {
    show_projector_window(window, *monitor.position(), *monitor.size())?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub index: usize,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub is_primary: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NdiFrameRequest {
    pub output_id: String,
    pub width: u32,
    pub height: u32,
    pub rgba_base64: String,
}

#[tauri::command]
pub fn list_monitors(app: tauri::AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let primary_position = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .map(|monitor| *monitor.position());
    Ok(monitors
        .iter()
        .enumerate()
        .map(|(index, m)| {
            let size = m.size();
            let position = *m.position();
            MonitorInfo {
                index,
                name: m.name().cloned().unwrap_or_else(|| "Unknown".to_string()),
                width: size.width,
                height: size.height,
                x: position.x,
                y: position.y,
                is_primary: Some(position) == primary_position,
            }
        })
        .collect())
}

/// Ensure the broadcast window for a given output exists (creates hidden if not).
#[tauri::command]
pub fn ensure_broadcast_window(app: tauri::AppHandle, output_id: String) -> Result<(), String> {
    let label = window_label(&output_id);
    if app.get_webview_window(label).is_some() {
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, label, WebviewUrl::App(window_url(&output_id).into()))
        .title(if output_id == "alt" {
            "FellowShow NDI Alt"
        } else {
            "FellowShow NDI"
        })
        .inner_size(1920.0, 1080.0)
        .decorations(true)
        .visible(false)
        .skip_taskbar(true)
        .focused(false)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_broadcast_window(
    app: tauri::AppHandle,
    output_id: String,
    monitor_index: usize,
) -> Result<(), String> {
    let label = window_label(&output_id);
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let monitor = monitors
        .get(monitor_index)
        .ok_or_else(|| format!("Monitor index {monitor_index} out of range"))?;
    log::info!(
        "Opening {output_id} broadcast window on monitor {monitor_index} ({:?}, {}x{} at {},{})",
        monitor.name(),
        monitor.size().width,
        monitor.size().height,
        monitor.position().x,
        monitor.position().y
    );

    // If window already exists (e.g. hidden for NDI), reuse it
    if let Some(window) = app.get_webview_window(label) {
        log::info!(
            "Reusing existing {output_id} broadcast window at {:?}",
            window.url()
        );
        show_projector_window_on_monitor(&window, monitor)?;
        return Ok(());
    }

    let title = if output_id == "alt" {
        "Projector - Alt"
    } else {
        "Projector - Program"
    };

    let window =
        WebviewWindowBuilder::new(&app, label, WebviewUrl::App(window_url(&output_id).into()))
            .title(title)
            .inner_size(1920.0, 1080.0)
            .decorations(true)
            .always_on_top(false)
            .skip_taskbar(false)
            .focused(true)
            .visible(true)
            .on_page_load(|window, payload| {
                log::info!(
                    "Projector page load {:?}: {}",
                    payload.event(),
                    payload.url()
                );
                if payload.event() == PageLoadEvent::Finished {
                    if let Err(error) = window.show() {
                        log::error!("Failed to show projector after page load: {error}");
                    }
                    if let Err(error) = window.set_focus() {
                        log::error!("Failed to focus projector after page load: {error}");
                    }
                }
            })
            .build()
            .map_err(|e| e.to_string())?;

    log::info!("Projector window created at {:?}", window.url());

    show_projector_window_on_monitor(&window, monitor)?;

    Ok(())
}

#[tauri::command]
pub fn close_broadcast_window(
    app: tauri::AppHandle,
    output_id: String,
    runtime: State<'_, Mutex<NdiRuntime>>,
) -> Result<(), String> {
    let label = window_label(&output_id);
    if let Some(window) = app.get_webview_window(label) {
        let ndi_active = runtime
            .lock()
            .map_err(|e| e.to_string())?
            .is_active(&output_id);
        if ndi_active {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.close().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn start_ndi(
    output_id: String,
    runtime: State<'_, Mutex<NdiRuntime>>,
    request: NdiStartRequest,
) -> Result<NdiSessionInfo, String> {
    let mut runtime = runtime.lock().map_err(|e| e.to_string())?;
    runtime.start(output_id, request).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stop_ndi(output_id: String, runtime: State<'_, Mutex<NdiRuntime>>) -> Result<(), String> {
    let mut runtime = runtime.lock().map_err(|e| e.to_string())?;
    runtime.stop(&output_id);
    Ok(())
}

#[derive(Serialize)]
pub struct NdiStatusResponse {
    pub active: bool,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
}

#[tauri::command]
pub fn get_ndi_status(
    output_id: String,
    runtime: State<'_, Mutex<NdiRuntime>>,
) -> Result<Option<NdiStatusResponse>, String> {
    let runtime = runtime.lock().map_err(|e| e.to_string())?;
    match runtime.current_info(&output_id) {
        Some(info) => Ok(Some(NdiStatusResponse {
            active: true,
            width: info.width,
            height: info.height,
            fps: info.fps,
        })),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn push_ndi_frame(
    runtime: State<'_, Mutex<NdiRuntime>>,
    request: NdiFrameRequest,
) -> Result<(), String> {
    let rgba_data = base64::engine::general_purpose::STANDARD
        .decode(&request.rgba_base64)
        .map_err(|e| format!("base64 decode error: {e}"))?;
    let mut runtime = runtime.lock().map_err(|e| e.to_string())?;
    runtime
        .send_frame_rgba(
            &request.output_id,
            request.width,
            request.height,
            &rgba_data,
        )
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;
    use std::future::Future;

    use super::*;

    #[derive(Debug, PartialEq)]
    enum WindowOperation {
        Decorations(bool),
        Fullscreen(bool),
        SkipTaskbar(bool),
        Position(tauri::PhysicalPosition<i32>),
        Size(tauri::PhysicalSize<u32>),
        Maximize,
        Show,
        Focus,
    }

    #[derive(Default)]
    struct RecordingWindow {
        operations: RefCell<Vec<WindowOperation>>,
    }

    impl ProjectorWindowOps for RecordingWindow {
        fn set_decorations(&self, decorations: bool) -> Result<(), String> {
            self.operations
                .borrow_mut()
                .push(WindowOperation::Decorations(decorations));
            Ok(())
        }

        fn set_fullscreen(&self, fullscreen: bool) -> Result<(), String> {
            self.operations
                .borrow_mut()
                .push(WindowOperation::Fullscreen(fullscreen));
            Ok(())
        }

        fn set_skip_taskbar(&self, skip: bool) -> Result<(), String> {
            self.operations
                .borrow_mut()
                .push(WindowOperation::SkipTaskbar(skip));
            Ok(())
        }

        fn set_physical_position(
            &self,
            position: tauri::PhysicalPosition<i32>,
        ) -> Result<(), String> {
            self.operations
                .borrow_mut()
                .push(WindowOperation::Position(position));
            Ok(())
        }

        fn set_physical_size(&self, size: tauri::PhysicalSize<u32>) -> Result<(), String> {
            self.operations
                .borrow_mut()
                .push(WindowOperation::Size(size));
            Ok(())
        }

        fn maximize(&self) -> Result<(), String> {
            self.operations.borrow_mut().push(WindowOperation::Maximize);
            Ok(())
        }

        fn show(&self) -> Result<(), String> {
            self.operations.borrow_mut().push(WindowOperation::Show);
            Ok(())
        }

        fn set_focus(&self) -> Result<(), String> {
            self.operations.borrow_mut().push(WindowOperation::Focus);
            Ok(())
        }
    }

    #[test]
    fn projector_window_should_be_positioned_and_sized_before_being_shown() {
        let window = RecordingWindow::default();
        let position = tauri::PhysicalPosition { x: -1920, y: 0 };
        let size = tauri::PhysicalSize {
            width: 1920,
            height: 1080,
        };

        show_projector_window(&window, position, size).unwrap();

        assert_eq!(
            *window.operations.borrow(),
            vec![
                WindowOperation::Fullscreen(false),
                WindowOperation::Decorations(true),
                WindowOperation::SkipTaskbar(false),
                WindowOperation::Position(position),
                WindowOperation::Size(size),
                WindowOperation::Maximize,
                WindowOperation::Show,
                WindowOperation::Focus,
            ]
        );
    }

    fn assert_async_projector_command<F, Fut>(_: F)
    where
        F: Fn(tauri::AppHandle, String, usize) -> Fut,
        Fut: Future<Output = Result<(), String>>,
    {
    }

    #[test]
    fn projector_creation_command_must_not_block_the_windows_ui_thread() {
        assert_async_projector_command(open_broadcast_window);
    }
}
