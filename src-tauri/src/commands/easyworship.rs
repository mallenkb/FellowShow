use fellowshow_songs::{EasyWorshipDatabases, ImportReport};
use std::path::Path;

/// Finds the paired databases below the selected `EasyWorship` profile folder.
#[tauri::command]
pub async fn find_easyworship_databases(folder: String) -> Result<EasyWorshipDatabases, String> {
    tauri::async_runtime::spawn_blocking(move || search_easyworship_databases(&folder))
        .await
        .map_err(|error| format!("Could not search that folder: {error}"))?
}

fn search_easyworship_databases(folder: &str) -> Result<EasyWorshipDatabases, String> {
    fellowshow_songs::find_databases(Path::new(folder)).map_err(|error| error.to_string())
}

/// Imports lyric text without changing either `EasyWorship` database.
#[tauri::command]
pub async fn import_easyworship_songs(
    songs_db_path: String,
    song_words_db_path: String,
) -> Result<ImportReport, String> {
    tauri::async_runtime::spawn_blocking(move || {
        fellowshow_songs::read_library(&EasyWorshipDatabases {
            songs_db_path,
            song_words_db_path,
        })
        .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| format!("Could not import EasyWorship songs: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::{params, Connection};
    use tempfile::tempdir;

    #[test]
    fn find_easyworship_databases_searches_nested_folders() {
        let directory = tempdir().expect("temporary directory");
        let data = directory
            .path()
            .join("Profiles")
            .join("Default")
            .join("Databases")
            .join("Data");
        std::fs::create_dir_all(&data).expect("data folder");
        std::fs::write(data.join("Songs.db"), b"").expect("songs file");
        std::fs::write(data.join("SongWords.db"), b"").expect("words file");

        let found = search_easyworship_databases(&directory.path().to_string_lossy())
            .expect("databases found");

        assert_eq!(
            found,
            EasyWorshipDatabases {
                songs_db_path: data.join("Songs.db").to_string_lossy().into_owned(),
                song_words_db_path: data.join("SongWords.db").to_string_lossy().into_owned(),
            }
        );
    }

    #[test]
    fn find_easyworship_databases_reports_missing_library() {
        let directory = tempdir().expect("temporary directory");
        let error = search_easyworship_databases(&directory.path().to_string_lossy())
            .expect_err("no library");
        assert!(error.contains("No EasyWorship song library"));
    }

    #[test]
    fn import_easyworship_songs_reads_titles_and_rtf_lyrics() {
        let directory = tempdir().expect("temporary directory");
        let songs_path = directory.path().join("Songs.db");
        let words_path = directory.path().join("SongWords.db");
        let songs_db = Connection::open(&songs_path).expect("songs database");
        songs_db
            .execute("CREATE TABLE song (title TEXT NOT NULL)", [])
            .expect("song table");
        songs_db
            .execute("INSERT INTO song (title) VALUES (?1)", ["  Grace  Song "])
            .expect("song row");
        let words_db = Connection::open(&words_path).expect("words database");
        words_db
            .execute(
                "CREATE TABLE word (song_id INTEGER NOT NULL, words TEXT NOT NULL)",
                [],
            )
            .expect("word table");
        words_db
            .execute(
                "INSERT INTO word (song_id, words) VALUES (?1, ?2)",
                params![
                    1,
                    r"{\rtf1\ansi Verse 1\par Amazing grace\line How sweet the sound}"
                ],
            )
            .expect("word row");

        let report = fellowshow_songs::read_library(&EasyWorshipDatabases {
            songs_db_path: songs_path.display().to_string(),
            song_words_db_path: words_path.display().to_string(),
        })
        .expect("imported songs");

        let songs = report.songs;
        assert_eq!(songs.len(), 1);
        assert_eq!(songs[0].title, "Grace Song");
        assert_eq!(
            songs[0].lyrics,
            "Verse 1\nAmazing grace\nHow sweet the sound"
        );
    }
}
