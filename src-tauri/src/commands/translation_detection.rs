use fellowshow_bible::{BibleDb, Bm25Result, Translation};

// Shared wording is common between versions. Only a long, distinctive quote
// can switch the operator's selected version without a spoken command.
const MIN_MATCH_WORDS: usize = 10;
const MIN_VERSION_MARGIN: usize = 3;
const MAX_CANDIDATE_VERSES: usize = 10;
const MAX_TRANSCRIPT_WORDS: usize = 200;

fn words(text: &str) -> Vec<String> {
    text.split(|character: char| !character.is_alphanumeric())
        .filter(|word| !word.is_empty())
        .take(MAX_TRANSCRIPT_WORDS)
        .map(str::to_lowercase)
        .collect()
}

fn longest_shared_run(spoken: &[String], verse: &[String]) -> usize {
    let mut previous = vec![0; verse.len() + 1];
    let mut best = 0;
    for word in spoken {
        let mut current = vec![0; verse.len() + 1];
        for (index, verse_word) in verse.iter().enumerate() {
            if word == verse_word {
                current[index + 1] = previous[index] + 1;
                best = best.max(current[index + 1]);
            }
        }
        previous = current;
    }
    best
}

/// Infer a version only when a quote clearly distinguishes installed versions.
pub(super) fn infer_from_quote(
    db: &BibleDb,
    transcript: &str,
    passages: &[Bm25Result],
) -> Option<Translation> {
    let spoken = words(transcript);
    if spoken.len() < MIN_MATCH_WORDS {
        return None;
    }
    let translations: Vec<Translation> = db
        .list_translations()
        .ok()?
        .into_iter()
        .filter(|translation| translation.is_downloaded && translation.language == "en")
        .collect();
    if translations.len() < 2 {
        return None;
    }
    let mut best: Option<(usize, usize)> = None;
    let mut ambiguous = false;
    for passage in passages.iter().take(MAX_CANDIDATE_VERSES) {
        let Some(mut scores) = translations
            .iter()
            .enumerate()
            .map(|(index, translation)| {
                let verse = db
                    .get_verse(
                        translation.id,
                        passage.book_number,
                        passage.chapter,
                        passage.verse,
                    )
                    .ok()??;
                Some((index, longest_shared_run(&spoken, &words(&verse.text))))
            })
            .collect::<Option<Vec<_>>>()
        else {
            // An unavailable verse could belong to the same version, so it
            // cannot establish a distinctive winner.
            continue;
        };
        scores.sort_unstable_by_key(|entry| std::cmp::Reverse(entry.1));
        let [(index, score), (_, runner_up), ..] = scores.as_slice() else {
            continue;
        };
        if *score < MIN_MATCH_WORDS || score.saturating_sub(*runner_up) < MIN_VERSION_MARGIN {
            continue;
        }
        match best {
            None => best = Some((*index, *score)),
            Some((_, old_score)) if *score > old_score => {
                best = Some((*index, *score));
                ambiguous = false;
            }
            Some((old_index, old_score)) if *score == old_score && *index != old_index => {
                ambiguous = true;
            }
            _ => {}
        }
    }
    if ambiguous {
        return None;
    }
    translations.get(best?.0).cloned()
}

#[cfg(test)]
mod tests {
    use super::*;

    const WORDING: &str =
        "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima";
    const DIFFERENT: &str = "one two three four five six seven eight nine ten eleven twelve";

    fn fixture(other: Option<&str>) -> (tempfile::TempDir, BibleDb, Vec<Bm25Result>) {
        let directory = tempfile::tempdir().expect("create test database directory");
        let path = directory.path().join("versions.db");
        let connection = rusqlite::Connection::open(&path).expect("create test database");
        connection.execute_batch(
            "CREATE TABLE translations (id INTEGER PRIMARY KEY, abbreviation TEXT, title TEXT, language TEXT, is_copyrighted INTEGER, is_downloaded INTEGER);
             CREATE TABLE verses (id INTEGER PRIMARY KEY, translation_id INTEGER, book_number INTEGER, book_name TEXT, book_abbreviation TEXT, chapter INTEGER, verse INTEGER, text TEXT);
             INSERT INTO translations VALUES (1, 'ONE', 'One', 'en', 0, 1), (2, 'TWO', 'Two', 'en', 0, 1);
             INSERT INTO verses VALUES (1, 1, 43, 'John', 'Jn', 3, 16, 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima');"
        ).expect("create test tables");
        if let Some(other) = other {
            connection
                .execute(
                    "INSERT INTO verses VALUES (2, 2, 43, 'John', 'Jn', 3, 16, ?1)",
                    [other],
                )
                .expect("insert comparison verse");
        }
        drop(connection);
        let db = BibleDb::open(&path).expect("open test database");
        let passages = vec![Bm25Result {
            rank: -1.0,
            book_number: 43,
            book_name: "John".into(),
            chapter: 3,
            verse: 16,
        }];
        (directory, db, passages)
    }

    #[test]
    fn distinctive_wording_selects_the_matching_installed_version() {
        let (_directory, db, passages) = fixture(Some(DIFFERENT));
        assert_eq!(
            infer_from_quote(&db, WORDING, &passages).map(|item| item.id),
            Some(1)
        );
    }

    #[test]
    fn identical_wording_does_not_switch_versions() {
        let (_directory, db, passages) = fixture(Some(WORDING));
        assert!(infer_from_quote(&db, WORDING, &passages).is_none());
    }

    #[test]
    fn an_incomplete_version_cannot_be_used_as_comparison() {
        let (_directory, db, passages) = fixture(None);
        assert!(infer_from_quote(&db, WORDING, &passages).is_none());
    }

    #[test]
    fn a_missing_third_version_does_not_produce_a_false_winner() {
        let (directory, db, passages) = fixture(Some(DIFFERENT));
        let connection = rusqlite::Connection::open(directory.path().join("versions.db"))
            .expect("open fixture for another translation");
        connection
            .execute(
                "INSERT INTO translations VALUES (3, 'THREE', 'Three', 'en', 0, 1)",
                [],
            )
            .expect("insert incomplete translation");
        assert!(infer_from_quote(&db, WORDING, &passages).is_none());
    }

    #[test]
    fn a_short_fragment_does_not_switch_versions() {
        let (_directory, db, passages) = fixture(Some(DIFFERENT));
        assert!(infer_from_quote(&db, "alpha bravo charlie", &passages).is_none());
    }
}
