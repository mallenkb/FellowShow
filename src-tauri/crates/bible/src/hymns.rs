use crate::db::BibleDb;
use crate::error::BibleError;
use crate::models::Hymn;

impl BibleDb {
    pub fn search_hymns(&self, query: &str, limit: usize) -> Result<Vec<Hymn>, BibleError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| BibleError::Internal(e.to_string()))?;
        #[expect(
            clippy::cast_possible_wrap,
            reason = "limit is a small page-size value that fits in i64"
        )]
        let limit_i64 = limit as i64;

        if query.trim().is_empty() {
            let mut stmt = conn.prepare(
                "SELECT id, slug, title, lyrics, source_url \
                 FROM hymns \
                 ORDER BY title COLLATE NOCASE \
                 LIMIT ?1",
            )?;
            let rows = stmt.query_map([limit_i64], hymn_from_row)?;
            return Ok(rows.collect::<Result<Vec<_>, _>>()?);
        }

        let like_pattern = format!("%{}%", query.trim());
        let mut stmt = conn.prepare(
            "SELECT id, slug, title, lyrics, source_url \
             FROM hymns \
             WHERE title LIKE ?1 OR lyrics LIKE ?1 \
             ORDER BY CASE WHEN title LIKE ?1 THEN 0 ELSE 1 END, title COLLATE NOCASE \
             LIMIT ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![like_pattern, limit_i64], hymn_from_row)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }
}

fn hymn_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Hymn> {
    Ok(Hymn {
        id: row.get(0)?,
        slug: row.get(1)?,
        title: row.get(2)?,
        lyrics: row.get(3)?,
        source_url: row.get(4)?,
    })
}
