use crate::db::BibleDb;
use crate::error::BibleError;
use crate::models::{Book, SearchVerse, Translation, Verse};

impl BibleDb {
    /// Look up a verse by its database primary key (verses.id).
    ///
    /// Like all `BibleDb` methods, this acquires the connection via
    /// [`BibleDb::conn`], which recovers from a poisoned mutex rather than
    /// panicking.
    pub fn get_verse_by_id(&self, id: i64) -> Result<Option<Verse>, BibleError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, translation_id, book_number, book_name, book_abbreviation, chapter, verse, text \
             FROM verses WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(rusqlite::params![id], |row: &rusqlite::Row| {
            Ok(Verse {
                id: row.get(0)?,
                translation_id: row.get(1)?,
                book_number: row.get(2)?,
                book_name: row.get(3)?,
                book_abbreviation: row.get(4)?,
                chapter: row.get(5)?,
                verse: row.get(6)?,
                text: row.get(7)?,
            })
        })?;
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    pub fn get_verse(
        &self,
        translation_id: i64,
        book_number: i32,
        chapter: i32,
        verse: i32,
    ) -> Result<Option<Verse>, BibleError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, translation_id, book_number, book_name, book_abbreviation, chapter, verse, text \
             FROM verses \
             WHERE translation_id = ?1 AND book_number = ?2 AND chapter = ?3 AND verse = ?4",
        )?;
        let mut rows = stmt.query_map(
            rusqlite::params![translation_id, book_number, chapter, verse],
            |row: &rusqlite::Row| {
                Ok(Verse {
                    id: row.get(0)?,
                    translation_id: row.get(1)?,
                    book_number: row.get(2)?,
                    book_name: row.get(3)?,
                    book_abbreviation: row.get(4)?,
                    chapter: row.get(5)?,
                    verse: row.get(6)?,
                    text: row.get(7)?,
                })
            },
        )?;
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    pub fn get_chapter(
        &self,
        translation_id: i64,
        book_number: i32,
        chapter: i32,
    ) -> Result<Vec<Verse>, BibleError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, translation_id, book_number, book_name, book_abbreviation, chapter, verse, text \
             FROM verses \
             WHERE translation_id = ?1 AND book_number = ?2 AND chapter = ?3 \
             ORDER BY verse",
        )?;
        let rows = stmt.query_map(
            rusqlite::params![translation_id, book_number, chapter],
            |row: &rusqlite::Row| {
                Ok(Verse {
                    id: row.get(0)?,
                    translation_id: row.get(1)?,
                    book_number: row.get(2)?,
                    book_name: row.get(3)?,
                    book_abbreviation: row.get(4)?,
                    chapter: row.get(5)?,
                    verse: row.get(6)?,
                    text: row.get(7)?,
                })
            },
        )?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn get_verse_range(
        &self,
        translation_id: i64,
        book_number: i32,
        chapter: i32,
        verse_start: i32,
        verse_end: i32,
    ) -> Result<Vec<Verse>, BibleError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, translation_id, book_number, book_name, book_abbreviation, chapter, verse, text \
             FROM verses \
             WHERE translation_id = ?1 AND book_number = ?2 AND chapter = ?3 \
               AND verse >= ?4 AND verse <= ?5 \
             ORDER BY verse",
        )?;
        let rows = stmt.query_map(
            rusqlite::params![translation_id, book_number, chapter, verse_start, verse_end],
            |row: &rusqlite::Row| {
                Ok(Verse {
                    id: row.get(0)?,
                    translation_id: row.get(1)?,
                    book_number: row.get(2)?,
                    book_name: row.get(3)?,
                    book_abbreviation: row.get(4)?,
                    chapter: row.get(5)?,
                    verse: row.get(6)?,
                    text: row.get(7)?,
                })
            },
        )?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    /// Load all verses for one translation for client-side context search indexing.
    pub fn load_translation_verses_for_search(
        &self,
        translation_id: i64,
    ) -> Result<Vec<SearchVerse>, BibleError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT book_number, book_name, chapter, verse, text \
             FROM verses \
             WHERE translation_id = ?1 \
             ORDER BY book_number, chapter, verse",
        )?;
        let rows = stmt.query_map([translation_id], |row: &rusqlite::Row| {
            Ok(SearchVerse {
                book_number: row.get(0)?,
                book_name: row.get(1)?,
                chapter: row.get(2)?,
                verse: row.get(3)?,
                text: row.get(4)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn list_translations(&self) -> Result<Vec<Translation>, BibleError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, abbreviation, title, language, is_copyrighted, is_downloaded \
             FROM translations",
        )?;
        let rows = stmt.query_map([], |row: &rusqlite::Row| {
            Ok(Translation {
                id: row.get(0)?,
                abbreviation: row.get(1)?,
                title: row.get(2)?,
                language: row.get(3)?,
                is_copyrighted: row.get(4)?,
                is_downloaded: row.get(5)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn get_translation_id_by_abbreviation(
        &self,
        abbreviation: &str,
    ) -> Result<Option<i64>, BibleError> {
        let conn = self.conn();
        let mut stmt = conn
            .prepare("SELECT id FROM translations WHERE abbreviation = ?1 AND is_downloaded = 1")?;
        let mut rows = stmt.query([abbreviation])?;
        match rows.next()? {
            Some(row) => Ok(Some(row.get(0)?)),
            None => Ok(None),
        }
    }

    pub fn list_books(&self, translation_id: i64) -> Result<Vec<Book>, BibleError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT id, translation_id, book_number, name, abbreviation, testament \
             FROM books \
             WHERE translation_id = ?1 \
             ORDER BY book_number",
        )?;
        let rows = stmt.query_map(rusqlite::params![translation_id], |row: &rusqlite::Row| {
            Ok(Book {
                id: row.get(0)?,
                translation_id: row.get(1)?,
                book_number: row.get(2)?,
                name: row.get(3)?,
                abbreviation: row.get(4)?,
                testament: row.get(5)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn install_translation_from_db(
        &self,
        source_db_path: &std::path::Path,
        abbreviation: &str,
    ) -> Result<Translation, BibleError> {
        let mut conn = self.conn();

        // ATTACH/DETACH are handled at the connection level, outside the
        // transaction. If they live inside the transaction, a failed install
        // can leave `source_db` attached (the detach fails while the rolled-back
        // transaction still holds locks/cursors on it), and every later install
        // then fails with "database source_db is locked / already in use".
        //
        // Clear any stale attachment from a previous attempt, attach fresh, run
        // the copy in its own transaction, then always detach afterwards.
        let _ = conn.execute("DETACH DATABASE source_db", []);
        conn.execute(
            "ATTACH DATABASE ?1 AS source_db",
            [source_db_path.to_string_lossy().as_ref()],
        )?;

        let outcome = Self::install_from_attached_source(&mut conn, abbreviation);

        let _ = conn.execute("DETACH DATABASE source_db", []);
        outcome
    }

    fn install_from_attached_source(
        conn: &mut rusqlite::Connection,
        abbreviation: &str,
    ) -> Result<Translation, BibleError> {
        let tx = conn.transaction()?;

        let source_translation: Translation = tx.query_row(
            "SELECT id, abbreviation, title, language, is_copyrighted, is_downloaded \
             FROM source_db.translations WHERE abbreviation = ?1 AND is_downloaded = 1",
            [abbreviation],
            |row| {
                Ok(Translation {
                    id: row.get(0)?,
                    abbreviation: row.get(1)?,
                    title: row.get(2)?,
                    language: row.get(3)?,
                    is_copyrighted: row.get(4)?,
                    is_downloaded: row.get(5)?,
                })
            },
        )?;

        let local_id: i64 = tx.query_row(
            "SELECT id FROM translations WHERE abbreviation = ?1",
            [abbreviation],
            |row| row.get(0),
        )?;

        tx.execute(
            "DELETE FROM verses_fts WHERE rowid IN (SELECT id FROM verses WHERE translation_id = ?1)",
            [local_id],
        )
        .or_else(|_| tx.execute("SELECT 1", []))?;
        tx.execute("DELETE FROM verses WHERE translation_id = ?1", [local_id])?;
        tx.execute("DELETE FROM books WHERE translation_id = ?1", [local_id])?;

        tx.execute(
            "UPDATE translations \
             SET title = ?2, language = ?3, is_copyrighted = ?4, is_downloaded = 1 \
             WHERE id = ?1",
            rusqlite::params![
                local_id,
                source_translation.title,
                source_translation.language,
                source_translation.is_copyrighted,
            ],
        )?;

        tx.execute(
            "INSERT INTO books (translation_id, book_number, name, abbreviation, testament) \
             SELECT ?1, book_number, name, abbreviation, testament \
             FROM source_db.books WHERE translation_id = ?2",
            rusqlite::params![local_id, source_translation.id],
        )?;
        tx.execute(
            "INSERT INTO verses (translation_id, book_id, book_number, book_name, book_abbreviation, chapter, verse, text) \
             SELECT ?1, local_books.id, source_verses.book_number, source_verses.book_name, source_verses.book_abbreviation, \
                    source_verses.chapter, source_verses.verse, source_verses.text \
             FROM source_db.verses source_verses \
             JOIN books local_books \
               ON local_books.translation_id = ?1 \
              AND local_books.book_number = source_verses.book_number \
             WHERE source_verses.translation_id = ?2",
            rusqlite::params![local_id, source_translation.id],
        )?;
        tx.execute(
            "INSERT INTO verses_fts(rowid, text) SELECT id, text FROM verses WHERE translation_id = ?1",
            [local_id],
        )
        .or_else(|_| tx.execute("SELECT 1", []))?;

        tx.commit()?;

        Ok(Translation {
            id: local_id,
            abbreviation: source_translation.abbreviation,
            title: source_translation.title,
            language: source_translation.language,
            is_copyrighted: source_translation.is_copyrighted,
            is_downloaded: true,
        })
    }
}
