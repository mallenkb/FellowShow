use std::path::Path;
use std::sync::Mutex;

use rusqlite::Connection;

use crate::error::BibleError;

pub struct BibleDb {
    pub(crate) conn: Mutex<Connection>,
}

impl std::fmt::Debug for BibleDb {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("BibleDb").finish_non_exhaustive()
    }
}

impl BibleDb {
    pub fn open(path: &Path) -> Result<Self, BibleError> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Acquire the SQLite connection, recovering the guard even if a previous
    /// holder panicked while locked.
    ///
    /// A `Mutex` stays poisoned permanently once a thread panics inside it, so
    /// `lock().unwrap()` (or propagating the poison error) would cascade-fail
    /// *every* subsequent Bible lookup for the rest of the session — an
    /// unacceptable failure mode mid-service. Recovering the inner guard keeps
    /// lookups working after a transient panic.
    pub(crate) fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    #[test]
    fn conn_recovers_from_poisoned_mutex() {
        let db = Arc::new(BibleDb {
            conn: Mutex::new(Connection::open_in_memory().unwrap()),
        });

        // Poison the mutex by panicking on another thread while it holds the lock.
        let poisoner = Arc::clone(&db);
        let handle = std::thread::spawn(move || {
            let _guard = poisoner.conn.lock().unwrap();
            panic!("boom while holding the database lock");
        });
        assert!(handle.join().is_err());
        assert!(db.conn.is_poisoned());

        // conn() must still hand back a usable connection rather than panicking.
        let conn = db.conn();
        let value: i64 = conn.query_row("SELECT 1", [], |row| row.get(0)).unwrap();
        assert_eq!(value, 1);
    }
}
