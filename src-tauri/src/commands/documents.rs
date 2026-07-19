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
    #[error("Microsoft Office could not convert the document to PDF: {0}")]
    MicrosoftOfficeConversionFailed(String),
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

    #[cfg(target_os = "windows")]
    if microsoft_office_application(&extension).is_some() {
        match convert_with_libreoffice(path, resource_dir) {
            Ok(pdf) => return Ok(pdf),
            Err(DocumentImportError::LibreOfficeUnavailable) => {
                return convert_with_microsoft_office(path, &extension);
            }
            Err(libreoffice_error) => return Err(libreoffice_error),
        }
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
    use super::{libreoffice_candidates, microsoft_office_application, prepare_document};
    use std::fs;
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

    #[test]
    fn windows_office_formats_map_to_their_native_converter() {
        assert_eq!(
            microsoft_office_application("docx"),
            Some("Word.Application")
        );
        assert_eq!(
            microsoft_office_application("pptx"),
            Some("PowerPoint.Application")
        );
        assert_eq!(
            microsoft_office_application("xlsx"),
            Some("Excel.Application")
        );
        assert_eq!(microsoft_office_application("pdf"), None);
    }

    #[test]
    fn pdf_documents_are_returned_without_conversion() {
        let path =
            std::env::temp_dir().join(format!("fellowshow-pdf-test-{}.pdf", std::process::id()));
        let bytes = b"%PDF-1.4\n%%EOF\n";
        fs::write(&path, bytes).expect("write PDF fixture");

        let result = prepare_document(&path, None).expect("read PDF");
        let _ = fs::remove_file(&path);

        assert_eq!(result, bytes);
    }

    #[cfg(target_os = "windows")]
    #[test]
    #[ignore = "requires Microsoft Office and FELLOWSHOW_DOCUMENT_TEST_DIR fixtures"]
    fn microsoft_office_fixtures_convert_to_pdf() {
        let fixture_dir = std::env::var_os("FELLOWSHOW_DOCUMENT_TEST_DIR")
            .map(PathBuf::from)
            .expect("set FELLOWSHOW_DOCUMENT_TEST_DIR");
        let resource_dir = std::env::var_os("FELLOWSHOW_DOCUMENT_RESOURCE_DIR").map(PathBuf::from);
        for name in ["sample.docx", "sample.pptx", "sample.xlsx"] {
            let pdf = prepare_document(&fixture_dir.join(name), resource_dir.as_deref())
                .unwrap_or_else(|error| panic!("convert {name}: {error}"));
            assert!(pdf.starts_with(b"%PDF-"), "{name} did not produce a PDF");
        }
    }
}

fn microsoft_office_application(extension: &str) -> Option<&'static str> {
    match extension {
        "doc" | "docx" | "docm" | "dot" | "dotx" | "odt" | "rtf" => Some("Word.Application"),
        "ppt" | "pptx" | "pps" | "ppsx" | "pot" | "potx" | "odp" => Some("PowerPoint.Application"),
        "xls" | "xlsx" | "xlsm" | "ods" => Some("Excel.Application"),
        _ => None,
    }
}

#[cfg(target_os = "windows")]
fn convert_with_microsoft_office(
    path: &Path,
    extension: &str,
) -> Result<Vec<u8>, DocumentImportError> {
    let application =
        microsoft_office_application(extension).ok_or(DocumentImportError::Unsupported)?;
    let workspace = ConversionWorkspace::create()?;
    let output_path = workspace.output_dir().join("converted.pdf");
    let script_path = workspace.root.join("convert.ps1");
    let script = r#"
param([string]$Application, [string]$InputPath, [string]$OutputPath)
$ErrorActionPreference = 'Stop'
$app = $null
$document = $null
try {
  $app = New-Object -ComObject $Application
  $app.Visible = $false
  switch ($Application) {
    'Word.Application' {
      $app.DisplayAlerts = 0
      $document = $app.Documents.Open($InputPath, $false, $true)
      $document.ExportAsFixedFormat($OutputPath, 17)
    }
    'PowerPoint.Application' {
      $document = $app.Presentations.Open($InputPath, $true, $true, $false)
      $document.SaveAs($OutputPath, 32)
    }
    'Excel.Application' {
      $app.DisplayAlerts = $false
      $document = $app.Workbooks.Open($InputPath, 0, $true)
      $document.ExportAsFixedFormat(0, $OutputPath)
    }
    default { throw "Unsupported Microsoft Office application: $Application" }
  }
} finally {
  if ($null -ne $document) {
    if ($Application -eq 'Word.Application') { $document.Close(0) }
    elseif ($Application -eq 'PowerPoint.Application') { $document.Close() }
    else { $document.Close($false) }
  }
  if ($null -ne $app) { $app.Quit() }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
"#;
    fs::write(&script_path, script).map_err(DocumentImportError::Workspace)?;

    let output = Command::new("powershell.exe")
        .arg("-NoLogo")
        .arg("-NoProfile")
        .arg("-NonInteractive")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-File")
        .arg(&script_path)
        .arg("-Application")
        .arg(application)
        .arg("-InputPath")
        .arg(path)
        .arg("-OutputPath")
        .arg(&output_path)
        .output()
        .map_err(DocumentImportError::LibreOfficeStart)?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_owned();
        let detail = if stderr.is_empty() { stdout } else { stderr };
        return Err(DocumentImportError::MicrosoftOfficeConversionFailed(
            if detail.is_empty() {
                format!("process exited with {}", output.status)
            } else {
                detail
            },
        ));
    }

    fs::read(output_path).map_err(DocumentImportError::Read)
}

#[cfg(not(target_os = "windows"))]
fn convert_with_microsoft_office(
    _path: &Path,
    _extension: &str,
) -> Result<Vec<u8>, DocumentImportError> {
    Err(DocumentImportError::LibreOfficeUnavailable)
}
