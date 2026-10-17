mod rtf;

use rusqlite::{Connection, OpenFlags};
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, thiserror::Error)]
pub enum SongLibraryError {
    #[error("No EasyWorship song library found. Choose the folder containing Songs.db and SongWords.db, or a parent folder.")]
    MissingLibrary,
    #[error("Choose an EasyWorship .db file.")]
    InvalidExtension,
    #[error("Could not read the EasyWorship database: {0}")]
    Database(#[from] rusqlite::Error),
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EasyWorshipDatabases {
    pub songs_db_path: String,
    pub song_words_db_path: String,
}

#[derive(Debug, Serialize)]
pub struct ImportedSong {
    pub id: String,
    pub title: String,
    pub lyrics: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkippedSong {
    pub id: String,
    pub title: String,
    pub reason: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportReport {
    pub songs: Vec<ImportedSong>,
    pub total_songs: usize,
    pub skipped_songs: Vec<SkippedSong>,
    pub orphan_lyric_ids: Vec<i64>,
    pub unassigned_lyric_rows: usize,
}

/// Finds a paired `SQLite` library within five folder levels of the selection.
pub fn find_databases(folder: &Path) -> Result<EasyWorshipDatabases, SongLibraryError> {
    let mut pending = vec![(folder.to_path_buf(), 0_usize)];
    let mut visited = 0;
    while let Some((directory, depth)) = pending.pop() {
        visited += 1;
        if visited > 5_000 {
            break;
        }
        let Ok(entries) = std::fs::read_dir(&directory) else {
            continue;
        };
        let mut songs_db = None;
        let mut words_db = None;
        for entry in entries.flatten() {
            let path = entry.path();
            // Do not follow directory symlinks back out of the selected tree.
            let Ok(kind) = entry.file_type() else {
                continue;
            };
            if kind.is_dir() {
                if depth < 5 {
                    pending.push((path, depth + 1));
                }
            } else if kind.is_file() {
                let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
                    continue;
                };
                if name.eq_ignore_ascii_case("songs.db") {
                    songs_db = Some(path);
                } else if name.eq_ignore_ascii_case("songwords.db") {
                    words_db = Some(path);
                }
            }
        }
        if let (Some(songs), Some(words)) = (songs_db, words_db) {
            return Ok(EasyWorshipDatabases {
                songs_db_path: songs.to_string_lossy().into_owned(),
                song_words_db_path: words.to_string_lossy().into_owned(),
            });
        }
    }
    Err(SongLibraryError::MissingLibrary)
}

fn open_read_only(path: &Path) -> Result<Connection, SongLibraryError> {
    if path
        .extension()
        .map_or(true, |extension| !extension.eq_ignore_ascii_case("db"))
    {
        return Err(SongLibraryError::InvalidExtension);
    }
    Ok(Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY,
    )?)
}

/// Reads both databases without writes. Layout values and font tables are not lyrics.
pub fn read_library(databases: &EasyWorshipDatabases) -> Result<ImportReport, SongLibraryError> {
    let songs_db = open_read_only(Path::new(&databases.songs_db_path))?;
    let words_db = open_read_only(Path::new(&databases.song_words_db_path))?;
    // A single scan avoids one unindexed SongWords query per song.
    let mut words_statement = words_db.prepare("SELECT song_id, words FROM word ORDER BY rowid")?;
    let words = words_statement.query_map([], |row| {
        Ok((
            row.get::<_, Option<i64>>(0)?,
            row.get::<_, Option<String>>(1)?,
        ))
    })?;
    let mut lyrics_by_id = HashMap::<i64, Vec<String>>::new();
    let mut unassigned_lyric_rows = 0;
    for row in words {
        let (Some(id), raw) = row? else {
            unassigned_lyric_rows += 1;
            continue;
        };
        let lyrics = rtf::to_text(raw.as_deref().unwrap_or_default());
        let lines = lyrics_by_id.entry(id).or_default();
        if !lyrics.is_empty() {
            lines.push(lyrics);
        }
    }

    let mut report = ImportReport {
        songs: Vec::new(),
        total_songs: 0,
        skipped_songs: Vec::new(),
        orphan_lyric_ids: Vec::new(),
        unassigned_lyric_rows,
    };
    let mut statement = songs_db.prepare("SELECT rowid, title FROM song ORDER BY rowid")?;
    let rows = statement.query_map([], |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
    })?;
    for row in rows {
        let (id, title) = row?;
        report.total_songs += 1;
        let title = title.split_whitespace().collect::<Vec<_>>().join(" ");
        let lyrics = lyrics_by_id.remove(&id).unwrap_or_default().join("\n\n");
        if title.is_empty() || lyrics.is_empty() {
            report.skipped_songs.push(SkippedSong {
                id: format!("easyworship-{id}"),
                title,
                reason: if lyrics.is_empty() {
                    "No lyric text"
                } else {
                    "Blank title"
                }
                .to_owned(),
            });
        } else {
            report.songs.push(ImportedSong {
                id: format!("easyworship-{id}"),
                title,
                lyrics,
            });
        }
    }
    report.orphan_lyric_ids = lyrics_by_id.keys().copied().collect();
    report.orphan_lyric_ids.sort_unstable();
    Ok(report)
}
