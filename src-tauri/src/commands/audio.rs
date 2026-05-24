use std::sync::Mutex;

use tauri::State;

use crate::state::AppState;
use fellowshow_audio::DeviceInfo;

/// List all available audio input devices.
#[tauri::command]
pub fn get_audio_devices(
    _state: State<'_, Mutex<AppState>>,
) -> Result<Vec<DeviceInfo>, String> {
    fellowshow_audio::device::enumerate_devices().map_err(|e| e.to_string())
}
