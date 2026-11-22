use std::{
    fs::{self, File},
    io,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{Connection, ErrorCode, OpenFlags};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SeedError {
    #[error("{action} {}: {source}", path.display())]
    Io {
        action: &'static str,
        path: PathBuf,
        source: io::Error,
    },
    #[error("could not validate {}: {source}", path.display())]
    Sql {
        path: PathBuf,
        source: rusqlite::Error,
    },
    #[error("invalid Bible database at {}: {reason}", path.display())]
    Invalid { path: PathBuf, reason: String },
    #[error("no bundled Bible seed for {}", .0.display())]
    MissingSeed(PathBuf),
}

fn io_error<'p>(action: &'static str, path: &'p Path) -> impl FnOnce(io::Error) -> SeedError + 'p {
    move |source| SeedError::Io {
        action,
        path: path.to_owned(),
        source,
    }
}

fn inspect(path: &Path) -> rusqlite::Result<Option<String>> {
    let db = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    let integrity: String = db.query_row("PRAGMA quick_check(1)", [], |row| row.get(0))?;
    if integrity != "ok" {
        return Ok(Some(integrity));
    }
    // Prepare against the same tables used for lookup, phrase search and cross-references.
    db.prepare(
        "SELECT t.id, t.abbreviation, t.title, t.language, t.license, t.is_copyrighted, t.is_downloaded,
                b.id, b.translation_id, b.book_number, b.name, b.abbreviation, b.testament,
                v.id, v.book_id, v.translation_id, v.book_number, v.book_name, v.book_abbreviation,
                v.chapter, v.verse, v.text, f.text, c.votes
         FROM translations t, books b, verses v, verses_fts f, cross_references c LIMIT 0",
    )?;
    let valid: bool = db.query_row(
        "SELECT EXISTS (SELECT 1 FROM translations)
            AND NOT EXISTS (
                SELECT 1 FROM translations t WHERE t.is_downloaded = 1
                AND NOT EXISTS (SELECT 1 FROM verses v WHERE v.translation_id = t.id)
            )",
        [],
        |row| row.get(0),
    )?;
    Ok((!valid).then(|| "empty catalog or downloaded translation without verses".into()))
}

pub fn validate(path: &Path) -> Result<(), SeedError> {
    let reason = match inspect(path) {
        Ok(None) => return Ok(()),
        Ok(Some(reason)) => reason,
        Err(rusqlite::Error::SqliteFailure(code, detail))
            if matches!(
                code.code,
                ErrorCode::DatabaseCorrupt | ErrorCode::NotADatabase
            ) =>
        {
            detail.unwrap_or_else(|| code.to_string())
        }
        Err(
            rusqlite::Error::SqliteFailure(_, Some(message))
            | rusqlite::Error::SqlInputError { msg: message, .. },
        ) if message.starts_with("no such table:") || message.starts_with("no such column:") => {
            message
        }
        Err(source) => {
            return Err(SeedError::Sql {
                path: path.to_owned(),
                source,
            })
        }
    };
    Err(SeedError::Invalid {
        path: path.to_owned(),
        reason,
    })
}

fn sibling(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(suffix);
    name.into()
}

const SIDECARS: [&str; 3] = ["-wal", "-shm", "-journal"];

fn remove_if_present(path: &Path) -> Result<(), SeedError> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(io_error("remove", path)(error)),
    }
}

fn clear_partial(partial: &Path) -> Result<(), SeedError> {
    for suffix in SIDECARS {
        remove_if_present(&sibling(partial, suffix))?;
    }
    remove_if_present(partial)
}

fn copy_synced(source: &Path, destination: &Path) -> Result<(), SeedError> {
    let mut input = File::open(source).map_err(io_error("open", source))?;
    // A bundled seed can be read-only. Create the writable copy with fresh permissions.
    let mut output = File::create_new(destination).map_err(io_error("create", destination))?;
    io::copy(&mut input, &mut output).map_err(io_error("copy to", destination))?;
    output.sync_all().map_err(io_error("sync", destination))
}

#[cfg(unix)]
fn sync_directory(directory: &Path) -> Result<(), SeedError> {
    File::open(directory)
        .and_then(|file| file.sync_all())
        .map_err(io_error("sync directory", directory))
}

fn backup_corrupt(path: &Path) -> Result<(), SeedError> {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let backup = sibling(path, &format!(".corrupt-{stamp}"));
    copy_synced(path, &backup)?;
    // A committed translation may still be in the WAL. Keep its files paired with the backup.
    for suffix in SIDECARS {
        let sidecar = sibling(path, suffix);
        if sidecar
            .try_exists()
            .map_err(io_error("inspect", &sidecar))?
        {
            copy_synced(&sidecar, &sibling(&backup, suffix))?;
        }
    }
    #[cfg(unix)]
    if let Some(directory) = path.parent() {
        sync_directory(directory)?;
    }
    log::warn!("Backed up corrupt Bible database to {}", backup.display());
    for suffix in SIDECARS {
        remove_if_present(&sibling(path, suffix))?;
    }
    Ok(())
}

pub fn prepare(directory: &Path, seed: Option<&Path>) -> Result<PathBuf, SeedError> {
    fs::create_dir_all(directory).map_err(io_error("create directory", directory))?;
    let path = directory.join("fellowshow.db");
    // Two launches must never remove or publish each other's .partial file.
    let lock_path = sibling(&path, ".seed-lock");
    let lock = File::options()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(&lock_path)
        .map_err(io_error("open startup lock", &lock_path))?;
    lock.lock().map_err(io_error("lock", &lock_path))?;
    let partial = sibling(&path, ".partial");
    clear_partial(&partial)?;

    let exists = path.try_exists().map_err(io_error("inspect", &path))?;
    if exists {
        match validate(&path) {
            Ok(()) => return Ok(path),
            Err(error @ SeedError::Invalid { .. }) => log::warn!("{error}"),
            Err(error) => return Err(error),
        }
    }

    let seed = seed.ok_or_else(|| SeedError::MissingSeed(path.clone()))?;
    let install = || {
        copy_synced(seed, &partial)?;
        validate(&partial)?;
        if exists {
            backup_corrupt(&path)?;
        }
        // All file and SQLite handles are closed before replacing the destination on Windows.
        fs::rename(&partial, &path).map_err(io_error("install Bible database at", &path))
    };
    let result = install();
    clear_partial(&partial)?;
    result?;
    #[cfg(unix)]
    sync_directory(directory)?;
    log::info!("Seeded writable Bible database at {}", path.display());
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn catalog(path: &Path, has_verses: bool) -> rusqlite::Result<()> {
        let db = Connection::open(path)?;
        db.execute_batch(include_str!("../../data/schema.sql"))?;
        db.execute_batch(
            "CREATE VIRTUAL TABLE verses_fts USING fts5(text, content='verses', content_rowid='id');
             INSERT INTO translations (id, abbreviation, title, language, license, is_downloaded)
             VALUES (1, 'KJV', 'King James', 'en', 'public domain', 0);",
        )?;
        if has_verses {
            db.execute_batch(
                "INSERT INTO books VALUES (1, 1, 43, 'John', 'Jn', 'NT');
                 INSERT INTO verses VALUES (1, 1, 1, 43, 'John', 'Jn', 1, 1, 'In the beginning');
                 UPDATE translations SET is_downloaded = 1;",
            )?;
        }
        Ok(())
    }

    #[test]
    fn interrupted_copy_never_becomes_the_working_database() -> TestResult {
        let dir = tempfile::tempdir()?;
        let seed = dir.path().join("seed.db");
        let path = dir.path().join("fellowshow.db");
        catalog(&seed, true)?;
        File::options().write(true).open(&seed)?.set_len(4096)?;
        fs::write(sibling(&path, ".partial"), b"abandoned copy")?;
        assert!(prepare(dir.path(), Some(&seed)).is_err());
        assert!(!path.exists());
        assert!(!sibling(&path, ".partial").exists());
        Ok(())
    }

    #[test]
    fn valid_existing_database_is_unchanged_even_without_seed() -> TestResult {
        let dir = tempfile::tempdir()?;
        let path = dir.path().join("fellowshow.db");
        catalog(&path, true)?;
        let original = fs::read(&path)?;
        fs::write(sibling(&path, ".partial"), b"old attempt")?;
        assert_eq!(prepare(dir.path(), None)?, path);
        assert_eq!(fs::read(&path)?, original);
        assert!(!sibling(&path, ".partial").exists());
        Ok(())
    }

    #[test]
    fn corrupt_database_is_backed_up_before_installing_metadata_only_seed() -> TestResult {
        let dir = tempfile::tempdir()?;
        let path = dir.path().join("fellowshow.db");
        let seed = dir.path().join("seed.db");
        catalog(&seed, false)?;
        fs::write(&path, b"damaged database")?;
        fs::write(sibling(&path, "-wal"), b"original WAL")?;
        assert_eq!(prepare(dir.path(), Some(&seed))?, path);
        validate(&path)?;
        let backup = fs::read_dir(dir.path())?
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .find(|p| {
                p.file_name().is_some_and(|name| {
                    let name = name.to_string_lossy();
                    name.starts_with("fellowshow.db.corrupt-")
                        && !name.ends_with("-wal")
                        && !name.ends_with("-shm")
                })
            })
            .expect("corrupt database backup");
        assert_eq!(fs::read(&backup)?, b"damaged database");
        assert_eq!(fs::read(sibling(&backup, "-wal"))?, b"original WAL");
        assert!(!sibling(&path, "-wal").exists());
        Ok(())
    }

    #[test]
    fn invalid_seed_preserves_the_existing_database() -> TestResult {
        let dir = tempfile::tempdir()?;
        let path = dir.path().join("fellowshow.db");
        let seed = dir.path().join("seed.db");
        fs::write(&path, b"original")?;
        catalog(&seed, false)?;
        Connection::open(&seed)?.execute("UPDATE translations SET is_downloaded = 1", [])?;
        assert!(matches!(
            prepare(dir.path(), Some(&seed)),
            Err(SeedError::Invalid { .. })
        ));
        assert_eq!(fs::read(&path)?, b"original");
        Ok(())
    }

    #[test]
    fn missing_required_table_triggers_recovery() -> TestResult {
        let dir = tempfile::tempdir()?;
        let path = dir.path().join("fellowshow.db");
        let seed = dir.path().join("seed.db");
        catalog(&path, true)?;
        Connection::open(&path)?.execute("DROP TABLE cross_references", [])?;
        catalog(&seed, false)?;
        prepare(dir.path(), Some(&seed))?;
        validate(&path)?;
        Ok(())
    }
}
