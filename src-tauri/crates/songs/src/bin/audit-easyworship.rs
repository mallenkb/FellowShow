use fellowshow_songs::{
    find_databases, read_library, EasyWorshipDatabases, ImportReport, ImportedSong,
};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::error::Error;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]
struct SongRef<'a> {
    id: &'a str,
    title: &'a str,
}

#[derive(Serialize)]
struct Finding<'a> {
    priority: &'static str,
    rule: &'static str,
    songs: Vec<SongRef<'a>>,
    evidence: Vec<String>,
    suggestion: &'static str,
}

fn finding<'a>(
    priority: &'static str,
    rule: &'static str,
    songs: &[&'a ImportedSong],
    evidence: Vec<String>,
    suggestion: &'static str,
) -> Finding<'a> {
    Finding {
        priority,
        rule,
        songs: songs
            .iter()
            .map(|song| SongRef {
                id: &song.id,
                title: &song.title,
            })
            .collect(),
        evidence,
        suggestion,
    }
}

fn normalized(text: &str) -> String {
    text.to_lowercase()
        .chars()
        .map(|c| {
            if c.is_whitespace() || ".,!?;:\"'’“”()[]".contains(c) {
                ' '
            } else {
                c
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn excerpt(line: &str) -> String {
    line.chars().take(180).collect()
}

fn audit_structure<'a>(song: &'a ImportedSong, findings: &mut Vec<Finding<'a>>) {
    let lines = song.lyrics.lines().collect::<Vec<_>>();
    let selected = [song];
    let numbered = lines
        .iter()
        .filter(|line| {
            let word = line.split_whitespace().next().unwrap_or_default();
            word.ends_with(['.', ')']) && word.trim_end_matches(['.', ')']).parse::<u32>().is_ok()
        })
        .count();
    let page_refs = lines
        .iter()
        .filter(|line| {
            line.split_whitespace().count() >= 3
                && line
                    .split_whitespace()
                    .last()
                    .is_some_and(|last| last.parse::<u32>().is_ok())
        })
        .count();
    if lines.len() >= 120 || song.lyrics.chars().count() >= 12_000 {
        findings.push(finding("high", "unusually_long_lyrics", &selected,
                vec![format!("{} lyric lines", lines.len())],
                "Check for appended songs, indexes or repeated imports. Compare the source before splitting this record."));
    }
    if (numbered >= 8 && numbered * 10 >= lines.len() * 7)
        || (page_refs >= 8 && page_refs * 10 >= lines.len() * 4)
        || lines.iter().any(|line| {
            matches!(
                line.trim().to_lowercase().as_str(),
                "index" | "table of contents" | "contents"
            )
        })
    {
        findings.push(finding("high", "possible_index", &selected,
                vec![format!("{numbered} numbered entries; {page_refs} lines ending with a number")],
                "Check whether this is an index or several appended songs. Keep only the intended lyrics after reviewing the source."));
    }
}

fn audit_text<'a>(song: &'a ImportedSong, findings: &mut Vec<Finding<'a>>) {
    let lines = song.lyrics.lines().collect::<Vec<_>>();
    let selected = [song];
    let credits = lines
        .iter()
        .enumerate()
        .filter(|(_, line)| {
            let lower = line.trim().to_lowercase();
            [
                "translation of ",
                "translation by ",
                "translated by ",
                "lyrics by ",
                "composed by ",
                "copyright ",
                "©",
            ]
            .iter()
            .any(|prefix| lower.starts_with(prefix))
                || lower == "national music committee"
        })
        .take(3)
        .map(|(i, line)| format!("lyrics:{} {}", i + 1, excerpt(line)))
        .collect::<Vec<_>>();
    if !credits.is_empty() {
        findings.push(finding("medium", "credits_in_lyrics", &selected, credits,
                "Review credit lines for removal from displayed lyrics. Preserve authorship and copyright in separate metadata."));
    }
    let damaged = lines
        .iter()
        .enumerate()
        .filter(|(_, line)| {
            line.contains('\u{fffd}') || line.chars().any(|c| c.is_control() && c != '\t')
        })
        .take(3)
        .map(|(i, line)| format!("lyrics:{} {}", i + 1, excerpt(line)))
        .collect::<Vec<_>>();
    if !damaged.is_empty() {
        findings.push(finding("medium", "damaged_characters", &selected, damaged,
                "Compare these characters with the source. Restore the intended text rather than dropping unknown characters."));
    }
    let ocr_words = song
        .lyrics
        .split_whitespace()
        .filter(|word| {
            word.chars().any(char::is_alphabetic)
                && word.contains(['0', '1', '4', '5'])
                && !word
                    .trim_matches(|c: char| !c.is_alphanumeric())
                    .to_lowercase()
                    .starts_with('x')
        })
        .take(6)
        .map(excerpt)
        .collect::<Vec<_>>();
    if ocr_words.len() >= 3 {
        findings.push(finding("medium", "possible_legacy_font_encoding", &selected, ocr_words,
                "Check the original font or source for digits used as Ghanaian letters. Review each conversion; do not replace digits across the library."));
    }
    if song.lyrics.contains("*60.") || song.lyrics.contains("*58.") || song.lyrics.contains("\\rtf")
    {
        findings.push(finding("high", "formatting_residue", &selected, Vec::new(),
                "Review the RTF conversion before importing this song. Formatting values should not appear in lyric text."));
    }
    if song.title.chars().count() > 120 {
        findings.push(finding("low", "long_title", &selected, Vec::new(),
                "Check whether the title contains copied lyric lines or credits. Keep a title that distinguishes this arrangement."));
    }
}

fn audit(songs: &[ImportedSong]) -> Vec<Finding<'_>> {
    let mut findings = Vec::new();
    let mut by_lyrics = BTreeMap::<String, Vec<&ImportedSong>>::new();
    let mut by_title = BTreeMap::<String, Vec<&ImportedSong>>::new();
    for song in songs {
        let lyrics_key = normalized(&song.lyrics);
        if lyrics_key.chars().count() >= 40 {
            by_lyrics.entry(lyrics_key).or_default().push(song);
        }
        by_title
            .entry(normalized(&song.title))
            .or_default()
            .push(song);
        audit_structure(song, &mut findings);
        audit_text(song, &mut findings);
    }
    for group in by_lyrics.values().filter(|group| group.len() > 1) {
        findings.push(finding("medium", "matching_lyrics", group,
            vec![format!("{} records match after spacing, case and punctuation normalization", group.len())],
            "Compare titles, arrangements and source references. Merge only confirmed duplicates and preserve any needed references."));
    }
    for group in by_title.values().filter(|group| group.len() > 1) {
        if group
            .iter()
            .map(|song| normalized(&song.lyrics))
            .collect::<BTreeSet<_>>()
            .len()
            > 1
        {
            findings.push(finding("low", "same_title_different_lyrics", group, Vec::new(),
                "Compare these versions. Keep distinct arrangements and add a useful version name where needed."));
        }
    }
    findings
}

fn checksum(path: &str) -> Result<String, Box<dyn Error>> {
    Ok(format!("{:x}", Sha256::digest(fs::read(path)?)))
}

fn checksums(databases: &EasyWorshipDatabases) -> Result<[String; 2], Box<dyn Error>> {
    Ok([
        checksum(&databases.songs_db_path)?,
        checksum(&databases.song_words_db_path)?,
    ])
}

fn csv_cell(value: &str) -> String {
    // Prevent a song title or excerpt from becoming a spreadsheet formula.
    let prefix = if value.trim_start().starts_with(['=', '+', '-', '@']) {
        "'"
    } else {
        ""
    };
    format!("\"{prefix}{}\"", value.replace('"', "\"\""))
}

fn save(path: &Path, bytes: &[u8]) -> Result<(), Box<dyn Error>> {
    let mut file = OpenOptions::new().write(true).create_new(true).open(path)?;
    file.write_all(bytes)?;
    Ok(())
}

fn render_csv(findings: &[Finding<'_>]) -> String {
    let mut csv = String::from("finding_id,priority,rule,song_id,title,evidence,suggestion\r\n");
    for (index, finding) in findings.iter().enumerate() {
        let empty = SongRef { id: "", title: "" };
        let refs = if finding.songs.is_empty() {
            vec![&empty]
        } else {
            finding.songs.iter().collect()
        };
        for song in refs {
            let evidence = finding.evidence.join(" | ");
            let finding_id = (index + 1).to_string();
            csv.push_str(
                &[
                    &finding_id,
                    finding.priority,
                    finding.rule,
                    song.id,
                    song.title,
                    &evidence,
                    finding.suggestion,
                ]
                .map(csv_cell)
                .join(","),
            );
            csv.push_str("\r\n");
        }
    }
    csv
}

fn import_findings(report: &ImportReport) -> Vec<Finding<'_>> {
    let mut findings = Vec::new();
    for song in &report.skipped_songs {
        findings.push(Finding {
            priority: "high", rule: "skipped_song",
            songs: vec![SongRef { id: &song.id, title: &song.title }],
            evidence: vec![song.reason.clone()],
            suggestion: "Restore the missing title or lyrics from the source. This record cannot be imported as a usable song.",
        });
    }
    for id in &report.orphan_lyric_ids {
        findings.push(Finding {
            priority: "high", rule: "orphan_lyrics", songs: Vec::new(),
            evidence: vec![format!("word.song_id={id} has no song.rowid")],
            suggestion: "Check whether the song record is missing or the lyric row points to the wrong song. Review before removing it.",
        });
    }
    if report.unassigned_lyric_rows > 0 {
        findings.push(Finding {
            priority: "high",
            rule: "unassigned_lyrics",
            songs: Vec::new(),
            evidence: vec![format!(
                "{} lyric rows have no song_id",
                report.unassigned_lyric_rows
            )],
            suggestion:
                "Identify the intended songs before assigning or removing these lyric rows.",
        });
    }
    findings
}

fn run() -> Result<(), Box<dyn Error>> {
    let mut args = std::env::args_os().skip(1);
    let Some(folder) = args.next() else {
        return Err("Usage: audit-easyworship <EasyWorship folder> [--out <report folder>]".into());
    };
    if folder == "--help" || folder == "-h" {
        println!("Usage: audit-easyworship <EasyWorship folder> [--out <report folder>]\nReads Songs.db and SongWords.db without modifying them. Writes JSON and CSV cleanup suggestions. Existing reports are never overwritten.");
        return Ok(());
    }
    let default_out = PathBuf::from("output/song-audit").join(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)?
            .as_millis()
            .to_string(),
    );
    let out = match args.next() {
        None => default_out,
        Some(flag) if flag == "--out" => {
            PathBuf::from(args.next().ok_or("--out needs a directory")?)
        }
        Some(_) => return Err("Expected --out <report folder>".into()),
    };
    if args.next().is_some() {
        return Err("Unexpected argument".into());
    }
    let databases = find_databases(Path::new(&folder))?;
    let before = checksums(&databases)?;
    let report = read_library(&databases)?;
    let mut findings = audit(&report.songs);
    findings.extend(import_findings(&report));
    findings.sort_by_key(|finding| {
        (
            match finding.priority {
                "high" => 0,
                "medium" => 1,
                _ => 2,
            },
            finding.rule,
        )
    });
    let after = checksums(&databases)?;
    if before != after {
        return Err(
            "The source databases changed during the audit. Close EasyWorship and run it again."
                .into(),
        );
    }
    let mut counts = BTreeMap::<&str, usize>::new();
    for finding in &findings {
        *counts.entry(finding.rule).or_default() += 1;
    }
    let affected = findings
        .iter()
        .flat_map(|finding| finding.songs.iter().map(|song| song.id))
        .collect::<BTreeSet<_>>()
        .len();
    let data = serde_json::json!({
        "schemaVersion": 1,
        "databases": databases,
        "sha256": { "songs": before[0], "songWords": before[1] },
        "sourceFilesUnchanged": true,
        "totalSongs": report.total_songs,
        "importableSongs": report.songs.len(),
        "skippedSongs": report.skipped_songs.len(),
        "unassignedLyricRows": report.unassigned_lyric_rows,
        "songsWithSuggestions": affected,
        "conversionSamples": report.songs.iter().take(3).map(|song| serde_json::json!({
            "id": song.id, "title": song.title,
            "firstLines": song.lyrics.lines().take(4).map(excerpt).collect::<Vec<_>>()
        })).collect::<Vec<_>>(),
        "findingsByRule": counts,
        "notes": [
            "This audit uses the same lyric reader as FellowShow. RTF layout data and font tables are excluded.",
            "Content rules are heuristics. Matching lyrics or titles do not prove that a record should be deleted.",
            "This report does not check lyrics against published originals or modify any songs."
        ],
        "findings": findings,
    });
    fs::create_dir_all(&out)?;
    save(&out.join("audit.json"), &serde_json::to_vec_pretty(&data)?)?;
    save(&out.join("review.csv"), render_csv(&findings).as_bytes())?;
    println!(
        "Audited {} songs. {} importable; {} skipped. {} songs have cleanup suggestions.",
        report.total_songs,
        report.songs.len(),
        report.skipped_songs.len(),
        affected
    );
    for (rule, count) in counts {
        println!("  {rule}: {count}");
    }
    println!(
        "Reports: {}\nSource database checksums are unchanged.",
        out.canonicalize()?.display()
    );
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("Song audit failed: {error}");
        std::process::exit(1);
    }
}
