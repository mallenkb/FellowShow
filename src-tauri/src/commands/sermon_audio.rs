use std::fs::{self, File};
use std::io::{self, BufReader, BufWriter, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{SystemTime, UNIX_EPOCH};

use fellowshow_audio::capture::{resample, RecordingFrame, RecordingSink};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

const SAMPLE_RATE: u32 = 48_000;
const WAV_HEADER_LEN: u64 = 44;
const EMPTY_WAV_HEADER: [u8; 44] = [0; 44];
const DIRECTORY: &str = "sermon-recordings";

fn directory(app: &AppHandle, sermon_id: &str) -> Result<PathBuf, String> {
    if sermon_id.is_empty()
        || sermon_id.len() > 128
        || !sermon_id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
    {
        return Err("Invalid sermon ID.".into());
    }
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join(DIRECTORY)
        .join(sermon_id))
}

pub(super) fn start(
    app: &AppHandle,
    sermon_id: &str,
) -> Result<(RecordingSink, JoinHandle<()>), String> {
    let path = directory(app, sermon_id)?;
    let (sender, receiver) = crossbeam_channel::bounded(128);
    let failed = Arc::new(AtomicBool::new(false));
    let sink = RecordingSink::new(sender, Arc::clone(&failed));
    let app = app.clone();
    let worker = thread::Builder::new().name("sermon-audio-writer".into()).spawn(move || {
        if let Err(error) = write_recording(&path, &receiver) {
            failed.store(true, Ordering::Release);
            let _ = app.emit("sermon_audio_error", format!("Could not save sermon audio: {error}"));
        } else if failed.load(Ordering::Acquire) {
            let _ = app.emit("sermon_audio_error", "Only the beginning of this recording was saved because audio capture fell behind.");
        }
    }).map_err(|error| error.to_string())?;
    Ok((sink, worker))
}

fn write_recording(
    path: &Path,
    receiver: &crossbeam_channel::Receiver<RecordingFrame>,
) -> io::Result<()> {
    let Ok(first) = receiver.recv() else {
        return Ok(());
    };
    let rate = u64::from(first.sample_rate);
    let first_duration_ms = first.samples.len() as u64 * 1_000 / rate;
    let started_at = first.ended_at_ms.saturating_sub(first_duration_ms);
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    fs::create_dir_all(path)?;
    let mut temporary = tempfile::NamedTempFile::new_in(path)?;
    {
        let mut output = BufWriter::new(temporary.as_file_mut());
        output.write_all(&EMPTY_WAV_HEADER)?;
        let mut source_samples = 0u64;
        let mut written_samples = 0u64;
        let mut bytes = Vec::new();
        for frame in std::iter::once(first).chain(receiver) {
            if u64::from(frame.sample_rate) != rate {
                return Err(io::Error::other("Audio sample rate changed during capture"));
            }
            source_samples += frame.samples.len() as u64;
            let samples = if frame.sample_rate == SAMPLE_RATE {
                frame.samples
            } else {
                resample(&frame.samples, frame.sample_rate, SAMPLE_RATE)
            };
            // Keep rounding errors from accumulating across microphone callbacks.
            let target = source_samples * u64::from(SAMPLE_RATE) / rate;
            let count = usize::try_from(target - written_samples).map_err(io::Error::other)?;
            bytes.clear();
            bytes.extend(
                samples
                    .iter()
                    .take(count)
                    .flat_map(|sample| sample.to_le_bytes()),
            );
            output.write_all(&bytes)?;
            written_samples += (bytes.len() / 2) as u64;
        }
        if written_samples == 0 {
            return Ok(());
        }
        finish_wav(&mut output, written_samples * 2)?;
    }
    temporary.as_file().sync_all()?;
    temporary.persist_noclobber(path.join(format!("{started_at}-{nonce}.wav")))?;
    Ok(())
}

fn finish_wav(output: &mut (impl Write + Seek), data_len: u64) -> io::Result<()> {
    let len = u32::try_from(data_len).map_err(io::Error::other)?;
    let riff_len = len
        .checked_add(36)
        .ok_or_else(|| io::Error::other("Recording exceeds WAV size limit"))?;
    output.seek(SeekFrom::Start(0))?;
    output.write_all(b"RIFF")?;
    output.write_all(&riff_len.to_le_bytes())?;
    output.write_all(b"WAVEfmt ")?;
    output.write_all(&16u32.to_le_bytes())?;
    output.write_all(&1u16.to_le_bytes())?; // PCM
    output.write_all(&1u16.to_le_bytes())?; // mono
    output.write_all(&SAMPLE_RATE.to_le_bytes())?;
    output.write_all(&(SAMPLE_RATE * 2).to_le_bytes())?;
    output.write_all(&2u16.to_le_bytes())?;
    output.write_all(&16u16.to_le_bytes())?;
    output.write_all(b"data")?;
    output.write_all(&len.to_le_bytes())?;
    output.flush()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioPart {
    path: PathBuf,
    started_at: u64,
    duration_ms: u64,
}

fn parts(path: &Path) -> io::Result<Vec<AudioPart>> {
    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(error),
    };
    let mut audio = Vec::new();
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("wav")
            || !entry.file_type()?.is_file()
        {
            continue;
        }
        let Some(started_at) = path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .and_then(|name| name.split_once('-'))
            .and_then(|(start, _)| start.parse().ok())
        else {
            continue;
        };
        let bytes = entry.metadata()?.len().saturating_sub(WAV_HEADER_LEN);
        if bytes > 0 {
            audio.push(AudioPart {
                path,
                started_at,
                duration_ms: bytes * 1_000 / u64::from(SAMPLE_RATE * 2),
            });
        }
    }
    audio.sort_by_key(|part| part.started_at);
    Ok(audio)
}

#[tauri::command]
pub async fn list_sermon_audio(
    app: AppHandle,
    sermon_id: String,
) -> Result<Vec<AudioPart>, String> {
    let path = directory(&app, &sermon_id)?;
    tauri::async_runtime::spawn_blocking(move || parts(&path))
        .await
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn delete_sermon_audio(app: AppHandle, sermon_id: String) -> Result<(), String> {
    let path = directory(&app, &sermon_id)?;
    match tokio::fs::remove_dir_all(path).await {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn ffmpeg_path() -> Option<PathBuf> {
    let executable = if cfg!(windows) {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };
    let path = std::env::var_os("PATH").unwrap_or_default();
    std::env::split_paths(&path)
        .chain([
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from("/usr/local/bin"),
        ])
        .map(|directory| directory.join(executable))
        .find(|candidate| candidate.is_file())
}

#[tauri::command]
pub fn sermon_audio_formats() -> Vec<&'static str> {
    let mut formats = vec!["wav"];
    if cfg!(target_os = "macos") || ffmpeg_path().is_some() {
        formats.push("m4a");
    }
    if ffmpeg_path().is_some() {
        formats.extend(["mp3", "flac", "ogg"]);
    }
    formats
}

fn combine(path: &Path, output: &mut (impl Write + Seek)) -> io::Result<()> {
    let recordings = parts(path)?;
    if recordings.is_empty() {
        return Err(io::Error::other("There is no saved audio for this sermon."));
    }
    output.write_all(&EMPTY_WAV_HEADER)?;
    let mut data_len = 0;
    for part in recordings {
        let mut input = BufReader::new(File::open(part.path)?);
        input.seek(SeekFrom::Start(WAV_HEADER_LEN))?;
        data_len += io::copy(&mut input, output)?;
    }
    finish_wav(output, data_len)
}

fn export(path: &Path, destination: &Path, format: &str) -> io::Result<()> {
    let parent = destination
        .parent()
        .ok_or_else(|| io::Error::other("Missing export folder"))?;
    let mut output = tempfile::NamedTempFile::new_in(parent)?;
    if format == "wav" {
        combine(path, &mut BufWriter::new(output.as_file_mut()))?;
    } else {
        let workspace = tempfile::tempdir()?;
        let input = workspace.path().join("sermon.wav");
        combine(path, &mut BufWriter::new(File::create(&input)?))?;
        let encoded = workspace.path().join(format!("sermon.{format}"));
        let result = if cfg!(target_os = "macos") && format == "m4a" {
            std::process::Command::new("/usr/bin/afconvert")
                .args(["-f", "m4af", "-d", "aac", "-b", "128000"])
                .arg(&input)
                .arg(&encoded)
                .output()?
        } else {
            let executable =
                ffmpeg_path().ok_or_else(|| io::Error::other("FFmpeg is unavailable"))?;
            std::process::Command::new(executable)
                .args(["-nostdin", "-loglevel", "error", "-i"])
                .arg(&input)
                .arg(&encoded)
                .output()?
        };
        if !result.status.success() {
            return Err(io::Error::other(format!(
                "Audio encoder failed: {}",
                String::from_utf8_lossy(&result.stderr).trim()
            )));
        }
        io::copy(
            &mut BufReader::new(File::open(encoded)?),
            output.as_file_mut(),
        )?;
    }
    output.as_file().sync_all()?;
    output.persist(destination)?;
    Ok(())
}

#[tauri::command]
pub async fn export_sermon_audio(
    app: AppHandle,
    sermon_id: String,
    destination: PathBuf,
    format: String,
) -> Result<(), String> {
    use tauri_plugin_fs::FsExt as _;

    let path = directory(&app, &sermon_id)?;
    if !sermon_audio_formats().contains(&format.as_str())
        || !destination
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case(&format))
        || !app.fs_scope().is_allowed(&destination)
    {
        return Err("Choose an export file with the selected audio format.".into());
    }
    let recording_root = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join(DIRECTORY);
    tauri::async_runtime::spawn_blocking(move || {
        let parent = destination
            .parent()
            .ok_or_else(|| io::Error::other("Missing export folder"))?;
        if recording_root.canonicalize().is_ok_and(|root| {
            parent
                .canonicalize()
                .is_ok_and(|folder| folder.starts_with(root))
        }) {
            return Err(io::Error::other(
                "Choose a folder outside the app's recordings.",
            ));
        }
        export(&path, &destination, &format)
    })
    .await
    .map_err(|error| error.to_string())?
    .map_err(|error| error.to_string())
}
