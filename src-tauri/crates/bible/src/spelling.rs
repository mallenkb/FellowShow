use std::collections::BTreeSet;

use rusqlite::{Connection, OptionalExtension};

use crate::error::BibleError;

fn edits(word: &str) -> BTreeSet<String> {
    let mut candidates = BTreeSet::new();
    // The caller limits this to short ASCII words, so byte offsets are character boundaries.
    for index in 0..word.len() {
        let mut deleted = word.to_owned();
        deleted.remove(index);
        candidates.insert(deleted);
        if index + 1 < word.len() {
            let mut swapped = word.as_bytes().to_vec();
            swapped.swap(index, index + 1);
            if let Ok(swapped) = String::from_utf8(swapped) {
                candidates.insert(swapped);
            }
        }
        for letter in 'a'..='z' {
            let mut replaced = word.to_owned();
            replaced.replace_range(index..=index, &letter.to_string());
            candidates.insert(replaced);
        }
    }
    for index in 0..=word.len() {
        for letter in 'a'..='z' {
            let mut inserted = word.to_owned();
            inserted.insert(index, letter);
            candidates.insert(inserted);
        }
    }
    candidates
}

/// Correct unknown words using indexed vocabulary lookups, without scanning verse text.
pub(crate) fn correct_query(conn: &Connection, query: &str) -> Result<Option<String>, BibleError> {
    conn.execute_batch("CREATE VIRTUAL TABLE IF NOT EXISTS temp.scripture_vocab USING fts5vocab(main, verses_fts, 'row');")?;
    let mut lookup = conn.prepare_cached("SELECT doc FROM temp.scripture_vocab WHERE term = ?1")?;
    let mut changed = false;
    let mut attempted = 0;
    let mut words = Vec::new();
    for word in query
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .take(24)
    {
        let word = word.to_lowercase();
        let known = lookup
            .query_row([&word], |row| row.get::<_, i64>(0))
            .optional()?
            .is_some();
        if known
            || attempted >= 4
            || !(4..=20).contains(&word.len())
            || !word.bytes().all(|b| b.is_ascii_lowercase())
        {
            words.push(word);
            continue;
        }
        attempted += 1;
        let mut best: Option<(String, i64)> = None;
        for candidate in edits(&word) {
            if let Some(frequency) = lookup
                .query_row([&candidate], |row| row.get::<_, i64>(0))
                .optional()?
            {
                if best.as_ref().is_none_or(|(_, count)| frequency > *count) {
                    best = Some((candidate, frequency));
                }
            }
        }
        if let Some((replacement, _)) = best {
            words.push(replacement);
            changed = true;
        } else {
            words.push(word);
        }
    }
    Ok(changed.then(|| words.join(" ")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn edits_include_transposed_letters() {
        assert!(edits("wrod").contains("word"));
    }

    #[test]
    fn correction_uses_bible_vocabulary() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("CREATE VIRTUAL TABLE verses_fts USING fts5(text); INSERT INTO verses_fts VALUES ('In the beginning was the Word');").unwrap();
        assert_eq!(
            correct_query(&conn, "begining wrod").unwrap().as_deref(),
            Some("beginning word")
        );
    }
}
