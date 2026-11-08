use std::path::PathBuf;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{ipc::Channel, AppHandle, Manager};
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;

const MODEL_SOURCE: &str =
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1";
static DOWNLOAD_LOCK: Mutex<()> = Mutex::const_new(());

#[derive(Clone, Copy, Default, Deserialize, Serialize)]
pub enum WhisperModel {
    #[serde(rename = "small.en")]
    SmallEnglish,
    #[default]
    #[serde(rename = "large-v3-turbo")]
    LargeV3Turbo,
}

struct ModelFile {
    filename: &'static str,
    size_bytes: u64,
    sha256: &'static str,
}

impl WhisperModel {
    fn file(self) -> ModelFile {
        match self {
            Self::SmallEnglish => ModelFile {
                filename: "ggml-small.en-q8_0.bin",
                size_bytes: 264_477_561,
                sha256: "67a179f608ea6114bd3fdb9060e762b588a3fb3bd00c4387971be4d177958067",
            },
            Self::LargeV3Turbo => ModelFile {
                filename: "ggml-large-v3-turbo-q8_0.bin",
                size_bytes: 874_188_075,
                sha256: "317eb69c11673c9de1e1f0d459b253999804ec71ac4c23c17ecf5fbe24e259a1",
            },
        }
    }
}

fn model_directory(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|path| path.join("models").join("whisper"))
        .map_err(|error| format!("Could not find the Whisper model folder: {error}"))
}

pub(super) fn installed_model_path(app: &AppHandle, model: WhisperModel) -> Option<PathBuf> {
    let file = model.file();
    if let Ok(directory) = model_directory(app) {
        let path = directory.join(file.filename);
        if path
            .metadata()
            .is_ok_and(|metadata| metadata.is_file() && metadata.len() == file.size_bytes)
        {
            return Some(path);
        }
    }

    let development = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../models/whisper");
    let resources = app
        .path()
        .resource_dir()
        .ok()
        .map(|directory| directory.join("models/whisper"));
    std::iter::once(development)
        .chain(resources)
        .map(|directory| directory.join(file.filename))
        .find(|path| path.is_file())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperModelStatus {
    model: WhisperModel,
    size_bytes: u64,
    installed: bool,
}

#[tauri::command]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri injects an owned AppHandle into commands"
)]
pub fn list_whisper_models(app: AppHandle) -> Result<Vec<WhisperModelStatus>, String> {
    if !cfg!(feature = "whisper") {
        return Err("This build does not include local Whisper support.".into());
    }
    Ok([WhisperModel::SmallEnglish, WhisperModel::LargeV3Turbo]
        .into_iter()
        .map(|model| WhisperModelStatus {
            model,
            size_bytes: model.file().size_bytes,
            installed: installed_model_path(&app, model).is_some(),
        })
        .collect())
}

#[tauri::command]
pub async fn download_whisper_model(
    app: AppHandle,
    model: WhisperModel,
    progress: Channel<u64>,
) -> Result<(), String> {
    if !cfg!(feature = "whisper") {
        return Err("This build does not include local Whisper support.".into());
    }
    let _lock = DOWNLOAD_LOCK
        .try_lock()
        .map_err(|_| "A Whisper model is already downloading.")?;
    if installed_model_path(&app, model).is_some() {
        return Ok(());
    }

    let file = model.file();
    let directory = model_directory(&app)?;
    tokio::fs::create_dir_all(&directory)
        .await
        .map_err(|error| format!("Could not create the Whisper model folder: {error}"))?;
    let mut response = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .read_timeout(Duration::from_secs(60))
        .build()
        .map_err(|error| error.to_string())?
        .get(format!("{MODEL_SOURCE}/{}", file.filename))
        .send()
        .await
        .and_then(reqwest::Response::error_for_status)
        .map_err(|error| {
            format!(
                "Could not download the Whisper model: {}",
                error.without_url()
            )
        })?;
    if response
        .content_length()
        .is_some_and(|length| length != file.size_bytes)
    {
        return Err("The Whisper model download has an unexpected size.".into());
    }

    let temporary = tempfile::NamedTempFile::new_in(&directory)
        .map_err(|error| format!("Could not create the model download file: {error}"))?;
    let mut output = tokio::io::BufWriter::new(tokio::fs::File::from_std(
        temporary.reopen().map_err(|error| error.to_string())?,
    ));
    let mut hasher = Sha256::new();
    let mut received = 0;
    let mut last_update = Instant::now();
    while let Some(chunk) = response.chunk().await.map_err(|error| {
        format!(
            "The Whisper model download was interrupted: {}",
            error.without_url()
        )
    })? {
        received += chunk.len() as u64;
        if received > file.size_bytes {
            return Err("The Whisper model download exceeded its expected size.".into());
        }
        output
            .write_all(&chunk)
            .await
            .map_err(|error| format!("Could not write the Whisper model to disk: {error}"))?;
        hasher.update(&chunk);
        if last_update.elapsed() >= Duration::from_millis(150) {
            let _ = progress.send(received);
            last_update = Instant::now();
        }
    }
    if received != file.size_bytes || format!("{:x}", hasher.finalize()) != file.sha256 {
        return Err("The Whisper model download failed verification. Try again.".into());
    }
    output.flush().await.map_err(|error| error.to_string())?;
    output
        .get_ref()
        .sync_all()
        .await
        .map_err(|error| error.to_string())?;
    drop(output);
    temporary
        .persist(directory.join(file.filename))
        .map_err(|error| format!("Could not install the Whisper model: {error}"))?;
    let _ = progress.send(received);
    Ok(())
}
