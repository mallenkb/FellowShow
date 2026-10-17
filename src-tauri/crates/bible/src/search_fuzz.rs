use super::*;
use std::sync::Mutex;

fn fixture() -> BibleDb {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch(
        "CREATE TABLE translations(id INTEGER PRIMARY KEY, language TEXT);
        INSERT INTO translations VALUES (1, 'en'), (2, 'twi');
        CREATE TABLE verses(id INTEGER PRIMARY KEY, translation_id INTEGER, book_number INTEGER,
            book_name TEXT, book_abbreviation TEXT, chapter INTEGER, verse INTEGER, text TEXT);
        INSERT INTO verses VALUES (1, 1, 43, 'John', 'Jn', 3, 16, 'For God so loved the world'),
            (2, 1, 43, 'John', 'Jn', 3, 17, 'God sent his Son into the world'),
            (3, 2, 43, 'John', 'Jn', 3, 16, 'Onyankopɔn dɔ wiase');
        CREATE VIRTUAL TABLE verses_fts USING fts5(text);
        INSERT INTO verses_fts(rowid, text) SELECT id, text FROM verses;",
    )
    .unwrap();
    BibleDb {
        conn: Mutex::new(conn),
    }
}

#[test]
fn database_search_handles_unicode_fts_punctuation_and_limit_boundaries() {
    let db = fixture();
    let pieces = [
        "God",
        "world",
        "Onyankopɔn",
        "🙂",
        "\0",
        "\"",
        "NEAR(",
        "*",
        "OR",
        "'",
        " ",
        "\n",
        "中",
    ];
    let limits = [0, 1, 2, 20, usize::MAX, usize::MAX / 4 + 1];
    let mut seed = 0x5eed_2026_u32;
    for case in 0..10_000 {
        seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        let offset = usize::try_from(seed).unwrap();
        let query: String = (0..case % 12)
            .map(|i| pieces[(offset + i) % pieces.len()])
            .collect();
        let limit = limits[case % limits.len()];
        let results = db
            .search_verses_bm25_including_translation(&query, limit, Some(2))
            .unwrap_or_else(|error| {
                panic!("seed=0x5eed2026 case={case} query={query:?} limit={limit}: {error}")
            });
        assert!(results.len() <= limit);
        assert!(results.iter().all(|v| v.rank.is_finite()));
        let refs: HashSet<_> = results
            .iter()
            .map(|v| (v.book_number, v.chapter, v.verse))
            .collect();
        assert_eq!(refs.len(), results.len());
        if let Ok(verses) = db.search_verses(&query, 1, limit) {
            assert!(verses.len() <= limit && verses.iter().all(|v| v.translation_id == 1));
        }
    }
}
