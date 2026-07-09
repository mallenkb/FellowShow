use rusqlite::Connection;
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedSong {
    id: String,
    title: String,
    lyrics: String,
}

/// Imports lyrics from the paired `SQLite` databases used by `EasyWorship` 6.1.
/// The databases are opened read-only and are never modified.
#[tauri::command]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri command arguments must be owned deserializable values"
)]
pub fn import_easyworship_songs(
    songs_db_path: String,
    song_words_db_path: String,
) -> Result<Vec<ImportedSong>, String> {
    let songs_db = open_read_only(&songs_db_path)?;
    let words_db = open_read_only(&song_words_db_path)?;

    let mut song_statement = songs_db
        .prepare("SELECT rowid, title FROM song ORDER BY rowid")
        .map_err(|error| database_error(&error))?;
    let songs = song_statement
        .query_map([], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|error| database_error(&error))?;

    let mut words_statement = words_db
        .prepare("SELECT words FROM word WHERE song_id = ?1 ORDER BY rowid")
        .map_err(|error| database_error(&error))?;
    let mut imported = Vec::new();

    for song in songs {
        let (id, title) = song.map_err(|error| database_error(&error))?;
        let lyric_rows = words_statement
            .query_map([id], |row| row.get::<_, String>(0))
            .map_err(|error| database_error(&error))?;
        let lyrics = lyric_rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| database_error(&error))?
            .into_iter()
            .map(|words| rtf_to_text(&words))
            .filter(|words| !words.is_empty())
            .collect::<Vec<_>>()
            .join("\n\n");

        let title = title.split_whitespace().collect::<Vec<_>>().join(" ");
        if !title.is_empty() && !lyrics.is_empty() {
            imported.push(ImportedSong {
                id: format!("easyworship-{id}"),
                title,
                lyrics,
            });
        }
    }

    Ok(imported)
}

fn open_read_only(path: &str) -> Result<Connection, String> {
    let path = Path::new(path);
    if path
        .extension()
        .map_or(true, |extension| !extension.eq_ignore_ascii_case("db"))
    {
        return Err("Choose an EasyWorship .db file.".to_owned());
    }
    Connection::open_with_flags(path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| database_error(&error))
}

fn database_error(error: &rusqlite::Error) -> String {
    format!("Could not read the EasyWorship database: {error}")
}

fn rtf_to_text(rtf: &str) -> String {
    let mut output = String::new();
    let mut chars = rtf.chars().peekable();

    while let Some(character) = chars.next() {
        if character == '{' || character == '}' {
            continue;
        }
        if character != '\\' {
            output.push(character);
            continue;
        }

        match chars.peek().copied() {
            Some('\\' | '{' | '}') => output.push(chars.next().unwrap_or_default()),
            Some('\'') => {
                chars.next();
                let hex: String = chars.by_ref().take(2).collect();
                if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                    output.push(char::from(byte));
                }
            }
            Some(_) => {
                let mut word = String::new();
                while chars.peek().is_some_and(char::is_ascii_alphabetic) {
                    word.push(chars.next().unwrap_or_default());
                }
                let sign = matches!(chars.peek(), Some('-')).then(|| chars.next());
                let mut digits = String::new();
                while chars.peek().is_some_and(char::is_ascii_digit) {
                    digits.push(chars.next().unwrap_or_default());
                }
                if chars.peek() == Some(&' ') {
                    chars.next();
                }

                if matches!(word.as_str(), "par" | "line") {
                    output.push('\n');
                } else if word == "u" {
                    let signed = format!("{}{}", sign.flatten().unwrap_or_default(), digits);
                    if let Ok(value) = signed.parse::<i32>() {
                        let value = if value < 0 { value + 65_536 } else { value };
                        if let Ok(value) = u32::try_from(value) {
                            if let Some(character) = char::from_u32(value) {
                                output.push(character);
                            }
                        }
                    }
                    if chars.peek() == Some(&'?') {
                        chars.next();
                    }
                }
            }
            None => output.push('\\'),
        }
    }

    output
        .replace('\u{a0}', " ")
        .lines()
        .map(str::trim)
        .collect::<Vec<_>>()
        .join("\n")
        .split('\n')
        .fold(Vec::<String>::new(), |mut lines, line| {
            if !line.is_empty() || lines.last().is_some_and(|previous| !previous.is_empty()) {
                lines.push(line.to_owned());
            }
            lines
        })
        .join("\n")
        .trim()
        .to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::params;
    use tempfile::tempdir;

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

        let songs = import_easyworship_songs(
            songs_path.display().to_string(),
            words_path.display().to_string(),
        )
        .expect("imported songs");

        assert_eq!(songs.len(), 1);
        assert_eq!(songs[0].title, "Grace Song");
        assert_eq!(
            songs[0].lyrics,
            "Verse 1\nAmazing grace\nHow sweet the sound"
        );
    }
}
