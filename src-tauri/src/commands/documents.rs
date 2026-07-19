use std::{
    env, fs, io,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

use tauri::ipc::Response;
use tauri::Manager;
use thiserror::Error;

const CONVERTIBLE_EXTENSIONS: &[&str] = &[
    "ppt", "pptx", "pps", "ppsx", "pot", "potx", "odp", "doc", "docx", "docm", "dot", "dotx",
    "odt", "rtf", "xls", "xlsx", "xlsm", "ods",
];

#[derive(Debug, Error)]
enum DocumentImportError {
    #[error("The selected document does not exist: {0}")]
    Missing(String),
    #[error("Unsupported document format. Choose PDF, PowerPoint, Word, OpenDocument, RTF, or an Excel spreadsheet.")]
    Unsupported,
    #[error("Could not create the document conversion workspace: {0}")]
    Workspace(#[source] io::Error),
    #[error("FellowShow's bundled document converter is missing. Reinstall FellowShow, then try again. PDFs can still be imported directly.")]
    LibreOfficeUnavailable,
    #[error("Could not start LibreOffice: {0}")]
    LibreOfficeStart(#[source] io::Error),
    #[error("LibreOffice could not convert the document to PDF: {0}")]
    ConversionFailed(String),
    #[error("LibreOffice finished without creating a PDF.")]
    OutputMissing,
    #[error("Could not read the converted document: {0}")]
    Read(#[source] io::Error),
}

struct ConversionWorkspace {
    root: PathBuf,
}

impl ConversionWorkspace {
    fn create() -> Result<Self, DocumentImportError> {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let root = env::temp_dir().join(format!(
            "fellowshow-document-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir_all(root.join("output"))
            .and_then(|()| fs::create_dir_all(root.join("profile")))
            .map_err(DocumentImportError::Workspace)?;
        Ok(Self { root })
    }

    fn output_dir(&self) -> PathBuf {
        self.root.join("output")
    }

    fn profile_dir(&self) -> PathBuf {
        self.root.join("profile")
    }
}

impl Drop for ConversionWorkspace {
    fn drop(&mut self) {
        if let Err(error) = fs::remove_dir_all(&self.root) {
            log::warn!(
                "Could not remove document conversion workspace {}: {error}",
                self.root.display()
            );
        }
    }
}

#[tauri::command]
pub async fn prepare_presentation_document(
    app: tauri::AppHandle,
    path: String,
) -> Result<Response, String> {
    let resource_dir = app.path().resource_dir().ok();
    let pdf = tauri::async_runtime::spawn_blocking(move || {
        prepare_document(Path::new(&path), resource_dir.as_deref())
    })
    .await
    .map_err(|error| format!("Document import stopped unexpectedly: {error}"))?
    .map_err(|error| error.to_string())?;
    Ok(Response::new(pdf))
}

fn prepare_document(
    path: &Path,
    resource_dir: Option<&Path>,
) -> Result<Vec<u8>, DocumentImportError> {
    if !path.is_file() {
        return Err(DocumentImportError::Missing(path.display().to_string()));
    }

    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or(DocumentImportError::Unsupported)?;

    if extension == "pdf" {
        return fs::read(path).map_err(DocumentImportError::Read);
    }
    if !CONVERTIBLE_EXTENSIONS.contains(&extension.as_str()) {
        return Err(DocumentImportError::Unsupported);
    }

    convert_with_libreoffice(path, resource_dir)
}

fn convert_with_libreoffice(
    path: &Path,
    resource_dir: Option<&Path>,
) -> Result<Vec<u8>, DocumentImportError> {
    let workspace = ConversionWorkspace::create()?;
    let output_dir = workspace.output_dir();
    let profile_argument = format!(
        "-env:UserInstallation={}",
        file_url(&workspace.profile_dir())
    );
    let mut found_executable = false;

    for executable in libreoffice_candidates(resource_dir) {
        let result = Command::new(&executable)
            .arg("--headless")
            .arg("--nologo")
            .arg("--nodefault")
            .arg(&profile_argument)
            .arg("--convert-to")
            .arg("pdf")
            .arg("--outdir")
            .arg(&output_dir)
            .arg(path)
            .output();

        let output = match result {
            Ok(output) => {
                found_executable = true;
                output
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
            Err(error) => return Err(DocumentImportError::LibreOfficeStart(error)),
        };

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_owned();
            let detail = if stderr.is_empty() { stdout } else { stderr };
            return Err(DocumentImportError::ConversionFailed(
                if detail.is_empty() {
                    format!("process exited with {}", output.status)
                } else {
                    detail
                },
            ));
        }
        break;
    }

    if !found_executable {
        return Err(DocumentImportError::LibreOfficeUnavailable);
    }

    let entries = fs::read_dir(&output_dir).map_err(DocumentImportError::Read)?;
    for entry in entries {
        let output_path = entry.map_err(DocumentImportError::Read)?.path();
        if output_path
            .extension()
            .is_some_and(|extension| extension.eq_ignore_ascii_case("pdf"))
        {
            return fs::read(output_path).map_err(DocumentImportError::Read);
        }
    }

    Err(DocumentImportError::OutputMissing)
}

fn libreoffice_candidates(resource_dir: Option<&Path>) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(resources) = resource_dir {
        #[cfg(target_os = "macos")]
        candidates.push(
            resources
                .join("document-converter")
                .join("LibreOffice.app")
                .join("Contents")
                .join("MacOS")
                .join("soffice"),
        );

        #[cfg(target_os = "windows")]
        candidates.push(
            resources
                .join("document-converter")
                .join("LibreOffice")
                .join("program")
                .join("soffice.exe"),
        );

        #[cfg(target_os = "linux")]
        candidates.push(
            resources
                .join("document-converter")
                .join("libreoffice")
                .join("program")
                .join("soffice"),
        );
    }

    if let Some(configured) = env::var_os("LIBREOFFICE_PATH").filter(|path| !path.is_empty()) {
        candidates.push(PathBuf::from(configured));
    }

    #[cfg(target_os = "macos")]
    candidates.push(PathBuf::from(
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    ));

    #[cfg(target_os = "windows")]
    {
        for variable in ["PROGRAMFILES", "PROGRAMFILES(X86)"] {
            if let Some(directory) = env::var_os(variable) {
                candidates.push(
                    PathBuf::from(directory)
                        .join("LibreOffice")
                        .join("program")
                        .join("soffice.exe"),
                );
            }
        }
    }

    candidates.push(PathBuf::from("libreoffice"));
    candidates.push(PathBuf::from("soffice"));
    candidates
}

fn file_url(path: &Path) -> String {
    let escaped = path
        .to_string_lossy()
        .replace('%', "%25")
        .replace(' ', "%20")
        .replace('#', "%23")
        .replace('?', "%3F")
        .replace('\\', "/");
    if escaped.starts_with('/') {
        format!("file://{escaped}")
    } else {
        format!("file:///{escaped}")
    }
}

#[cfg(test)]
mod tests {
    use super::libreoffice_candidates;
    use std::path::{Path, PathBuf};

    #[test]
    fn bundled_converter_is_the_first_candidate() {
        let resources = Path::new("/fellowshow/resources");
        let candidates = libreoffice_candidates(Some(resources));

        #[cfg(target_os = "macos")]
        let expected = PathBuf::from(
            "/fellowshow/resources/document-converter/LibreOffice.app/Contents/MacOS/soffice",
        );
        #[cfg(target_os = "windows")]
        let expected = PathBuf::from(
            "/fellowshow/resources/document-converter/LibreOffice/program/soffice.exe",
        );
        #[cfg(target_os = "linux")]
        let expected =
            PathBuf::from("/fellowshow/resources/document-converter/libreoffice/program/soffice");

        assert_eq!(candidates.first(), Some(&expected));
    }
}
