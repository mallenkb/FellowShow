use std::path::{Path, PathBuf};
use std::process::Stdio;

use fellowshow_stt::local_speech::LocalSpeechProvider;
use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, AppHandle, Manager};
use tokio::process::Command;

static INSTALLING: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());
const READY_FILE: &str = "ready-v1";

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LocalSpeechModel {
    Nemotron,
    Moonshine,
    Zipformer,
    Voxtral,
    Parakeet,
}

impl LocalSpeechModel {
    const ALL: [Self; 5] = [
        Self::Nemotron,
        Self::Moonshine,
        Self::Zipformer,
        Self::Voxtral,
        Self::Parakeet,
    ];

    const fn id(self) -> &'static str {
        match self {
            Self::Nemotron => "nemotron",
            Self::Moonshine => "moonshine",
            Self::Zipformer => "zipformer",
            Self::Voxtral => "voxtral",
            Self::Parakeet => "parakeet",
        }
    }

    const fn unavailable_reason(self) -> Option<&'static str> {
        match self {
            Self::Voxtral if !cfg!(all(target_os = "macos", target_arch = "aarch64")) => {
                Some("Requires an Apple Silicon Mac")
            }
            Self::Moonshine
                if cfg!(all(target_os = "macos", not(target_arch = "aarch64")))
                    || cfg!(all(target_os = "windows", not(target_arch = "x86_64"))) =>
            {
                Some("No Moonshine runtime is available for this device")
            }
            _ => None,
        }
    }

    const fn packages(self) -> &'static [&'static str] {
        match self {
            Self::Moonshine => &["moonshine-voice==0.1.6", "numpy"],
            Self::Voxtral => &["mlx-audio==0.6.4"],
            Self::Zipformer => &["sherpa-onnx==2.0.1", "numpy", "sentencepiece"],
            Self::Nemotron | Self::Parakeet => &["sherpa-onnx==2.0.1", "numpy"],
        }
    }

    fn root(self, app: &AppHandle) -> Result<PathBuf, String> {
        app.path()
            .app_data_dir()
            .map(|root| root.join("local-speech").join(self.id()))
            .map_err(|error| format!("Could not locate local speech storage: {error}"))
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalSpeechModelStatus {
    model: LocalSpeechModel,
    installed: bool,
    unavailable_reason: Option<&'static str>,
}

fn python_path(root: &Path) -> PathBuf {
    let executable = if cfg!(windows) {
        "Scripts/python.exe"
    } else {
        "bin/python"
    };
    root.join("venv").join(executable)
}

fn is_installed(root: &Path) -> bool {
    root.join(READY_FILE).is_file() && python_path(root).is_file()
}

pub fn installed_provider(
    app: &AppHandle,
    model: LocalSpeechModel,
) -> Result<LocalSpeechProvider, String> {
    if let Some(reason) = model.unavailable_reason() {
        return Err(reason.into());
    }
    let root = model.root(app)?;
    if !is_installed(&root) {
        return Err("Download your selected model in Settings → Speech before starting.".into());
    }
    Ok(LocalSpeechProvider::new(
        python_path(&root),
        root,
        model.id(),
    ))
}

#[tauri::command]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri injects an owned AppHandle into commands"
)]
pub fn list_local_speech_models(app: AppHandle) -> Result<Vec<LocalSpeechModelStatus>, String> {
    LocalSpeechModel::ALL
        .into_iter()
        .map(|model| {
            Ok(LocalSpeechModelStatus {
                model,
                installed: is_installed(&model.root(&app)?),
                unavailable_reason: model.unavailable_reason(),
            })
        })
        .collect()
}

fn uv_command(app: &AppHandle, root: &Path) -> Command {
    let executable = if cfg!(windows) { "uv.exe" } else { "uv" };
    let home = app.path().home_dir().ok();
    let candidates = [
        home.as_ref()
            .map(|home| home.join(".local").join("bin").join(executable)),
        home.as_ref()
            .map(|home| home.join(".cargo").join("bin").join(executable)),
        Some(Path::new("/opt/homebrew/bin").join(executable)),
        Some(Path::new("/usr/local/bin").join(executable)),
    ];
    let path = candidates
        .into_iter()
        .flatten()
        .find(|path| path.is_file())
        .unwrap_or_else(|| PathBuf::from(executable));
    let shared = root.with_file_name("runtime");
    let mut command = Command::new(path);
    command
        .arg("--no-config")
        .current_dir(root)
        .env("UV_PYTHON_INSTALL_DIR", shared.join("python"))
        .env("UV_CACHE_DIR", shared.join("cache"))
        .env_remove("UV_INDEX")
        .env_remove("UV_INDEX_URL")
        .env_remove("UV_EXTRA_INDEX_URL")
        .env_remove("UV_FIND_LINKS")
        .kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    command
}

async fn install_step(command: &mut Command, stage: &str) -> Result<(), String> {
    let output = command
        .stdin(Stdio::null())
        .output()
        .await
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound && stage == "Set up Python" {
                "Install uv, then retry the download.".into()
            } else {
                format!("{stage}: {error}")
            }
        })?;
    if output.status.success() {
        return Ok(());
    }

    // The model worker sends its error over stdout. uv reports errors on stderr.
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let worker_error = stdout.lines().rev().find_map(|line| {
        let event = serde_json::from_str::<serde_json::Value>(line).ok()?;
        (event["type"] == "error").then(|| event["text"].as_str().map(str::to_owned))?
    });
    let detail = worker_error.unwrap_or_else(|| {
        stderr
            .lines()
            .rev()
            .find(|line| !line.trim().is_empty())
            .unwrap_or("The installer exited before setup completed.")
            .trim()
            .to_owned()
    });
    Err(format!("{stage}: {detail}"))
}

#[tauri::command]
pub async fn download_local_speech_model(
    app: AppHandle,
    model: LocalSpeechModel,
    progress: Channel<&'static str>,
) -> Result<(), String> {
    if let Some(reason) = model.unavailable_reason() {
        return Err(reason.into());
    }
    let _install = INSTALLING
        .try_lock()
        .map_err(|_| "Another local speech model is already downloading.")?;
    let root = model.root(&app)?;
    if is_installed(&root) {
        return Ok(());
    }

    let python = python_path(&root);
    tokio::fs::create_dir_all(&root)
        .await
        .map_err(|error| format!("Could not create local speech storage: {error}"))?;
    let _ = progress.send("Setting up Python…");
    if !python.is_file() {
        install_step(
            uv_command(&app, &root)
                .args(["venv", "--python", "3.12", "--managed-python", "--clear"])
                .arg(root.join("venv")),
            "Set up Python",
        )
        .await?;
    }
    let _ = progress.send("Installing runtime…");
    install_step(
        uv_command(&app, &root)
            .args([
                "pip",
                "install",
                "--only-binary",
                ":all:",
                "--default-index",
                "https://pypi.org/simple",
                "--python",
            ])
            .arg(&python)
            .args(model.packages()),
        "Install the speech runtime",
    )
    .await?;
    if matches!(model, LocalSpeechModel::Zipformer) {
        // The first 66 entries are full book names. Zipformer's tokenizer
        // uses uppercase text and spells out numbers.
        let terms = fellowshow_stt::bible_keyterms()
            .into_iter()
            .take(66)
            .map(|term| {
                term.to_ascii_uppercase()
                    .replace("1 ", "FIRST ")
                    .replace("2 ", "SECOND ")
                    .replace("3 ", "THIRD ")
            })
            .collect::<Vec<_>>()
            .join("\n");
        tokio::fs::write(root.join("bible-keyterms.txt"), terms)
            .await
            .map_err(|error| format!("Could not save Bible keyterms: {error}"))?;
    }

    let _ = progress.send("Downloading model…");
    let provider = LocalSpeechProvider::new(python, root.clone(), model.id());
    install_step(
        &mut provider.worker_command("download"),
        "Download the model",
    )
    .await?;
    tokio::fs::write(root.join(READY_FILE), [])
        .await
        .map_err(|error| format!("Could not mark the model as installed: {error}"))
}
