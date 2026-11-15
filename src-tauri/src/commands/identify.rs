//! Identify: a large label on each screen for a few seconds, so an operator
//! with several identical displays (for example two or more inputs on one
//! video switcher) can see which screen is which.

use std::time::Duration;

use serde::Deserialize;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

use super::broadcast::projector_placement;

const LABEL_PREFIX: &str = "identify-screen-";
const CARD_WIDTH: f64 = 760.0;
const CARD_HEIGHT: f64 = 320.0;
const SHOW_FOR: Duration = Duration::from_secs(5);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentifyScreenRequest {
    pub monitor_index: usize,
    pub title: String,
    pub detail: String,
}

/// The page URL for one label, with its text passed as query parameters.
fn identify_page_url(title: &str, detail: &str) -> Result<String, String> {
    let mut url =
        tauri::Url::parse("http://localhost/identify-screen.html").map_err(|e| e.to_string())?;
    url.query_pairs_mut()
        .append_pair("title", title)
        .append_pair("detail", detail);
    let query = url.query().unwrap_or_default();
    Ok(format!("identify-screen.html?{query}"))
}

/// A card centred on the monitor, in physical pixels.
fn card_bounds(
    monitor_position: tauri::PhysicalPosition<i32>,
    monitor_size: tauri::PhysicalSize<u32>,
    scale_factor: f64,
) -> (tauri::PhysicalPosition<i32>, tauri::PhysicalSize<u32>) {
    let size = tauri::PhysicalSize::<u32>::from_logical(
        tauri::LogicalSize::new(CARD_WIDTH, CARD_HEIGHT),
        scale_factor,
    );
    let width = size.width.min(monitor_size.width);
    let height = size.height.min(monitor_size.height);
    let offset_x = i32::try_from((monitor_size.width - width) / 2).unwrap_or(0);
    let offset_y = i32::try_from((monitor_size.height - height) / 2).unwrap_or(0);
    (
        tauri::PhysicalPosition {
            x: monitor_position.x.saturating_add(offset_x),
            y: monitor_position.y.saturating_add(offset_y),
        },
        tauri::PhysicalSize { width, height },
    )
}

fn close_identify_windows(app: &tauri::AppHandle) {
    for (label, window) in app.webview_windows() {
        if label.starts_with(LABEL_PREFIX) {
            if let Err(error) = window.close() {
                log::warn!("Identify: failed to close {label}: {error}");
            }
        }
    }
}

/// Show a label on each requested screen for a few seconds. Screens already
/// showing a full-screen output get their label from that output instead, so
/// the caller leaves them out.
#[tauri::command]
pub async fn identify_screens(
    app: tauri::AppHandle,
    screens: Vec<IdentifyScreenRequest>,
) -> Result<(), String> {
    close_identify_windows(&app);
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;

    for screen in screens {
        let Some(monitor) = monitors.get(screen.monitor_index) else {
            log::warn!(
                "Identify: monitor {} is no longer connected",
                screen.monitor_index
            );
            continue;
        };
        let label = format!("{LABEL_PREFIX}{}", screen.monitor_index);
        let url = identify_page_url(&screen.title, &screen.detail)?;
        let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
            .title(format!("Identify {}", screen.title))
            .decorations(false)
            .always_on_top(true)
            .visible_on_all_workspaces(true)
            .skip_taskbar(true)
            .resizable(false)
            .focused(false)
            .visible(false)
            .build()
            .map_err(|e| e.to_string())?;

        let (position, size) =
            card_bounds(*monitor.position(), *monitor.size(), monitor.scale_factor());
        let (position, size) = projector_placement(position, size, monitor.scale_factor());
        window.set_position(position).map_err(|e| e.to_string())?;
        window.set_size(size).map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
    }

    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(SHOW_FOR).await;
        close_identify_windows(&handle);
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identify_label_text_is_encoded_into_the_page_url() {
        let url = identify_page_url("Screen 3", "Video Overlays & Lyrics").unwrap();
        assert_eq!(
            url,
            "identify-screen.html?title=Screen+3&detail=Video+Overlays+%26+Lyrics"
        );
    }

    #[test]
    fn identify_card_is_centred_on_its_monitor() {
        let (position, size) = card_bounds(
            tauri::PhysicalPosition { x: 1728, y: 0 },
            tauri::PhysicalSize {
                width: 1920,
                height: 1080,
            },
            1.0,
        );
        assert_eq!(
            size,
            tauri::PhysicalSize {
                width: 760,
                height: 320
            }
        );
        assert_eq!(
            position,
            tauri::PhysicalPosition {
                x: 1728 + 580,
                y: 380
            }
        );
    }

    #[test]
    fn identify_card_scales_with_retina_displays() {
        let (position, size) = card_bounds(
            tauri::PhysicalPosition { x: 0, y: 0 },
            tauri::PhysicalSize {
                width: 3456,
                height: 2234,
            },
            2.0,
        );
        assert_eq!(
            size,
            tauri::PhysicalSize {
                width: 1520,
                height: 640
            }
        );
        assert_eq!(position, tauri::PhysicalPosition { x: 968, y: 797 });
    }
}
