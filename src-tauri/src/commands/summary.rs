use std::collections::{HashMap, HashSet};

use serde::Serialize;

const MAX_KEY_POINTS: usize = 4;
const MAX_POINT_CHARS: usize = 280;

#[derive(Serialize)]
pub struct PreachingSummary {
    pub overview: String,
    pub key_points: Vec<String>,
    pub scriptures: Vec<String>,
}

fn is_meaningful_word(word: &str) -> bool {
    word.len() >= 4
        && !matches!(
            word,
            "about"
                | "after"
                | "again"
                | "also"
                | "because"
                | "been"
                | "before"
                | "being"
                | "between"
                | "could"
                | "does"
                | "from"
                | "have"
                | "into"
                | "just"
                | "like"
                | "more"
                | "most"
                | "only"
                | "other"
                | "over"
                | "said"
                | "some"
                | "than"
                | "that"
                | "their"
                | "them"
                | "then"
                | "there"
                | "these"
                | "they"
                | "this"
                | "those"
                | "through"
                | "very"
                | "what"
                | "when"
                | "where"
                | "which"
                | "while"
                | "with"
                | "would"
                | "your"
        )
}

fn meaningful_words(text: &str) -> Vec<String> {
    text.split(|character: char| !character.is_alphanumeric())
        .filter_map(|word| {
            let normalized = word.to_lowercase();
            is_meaningful_word(&normalized).then_some(normalized)
        })
        .collect()
}

fn truncate_point(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.chars().count() <= MAX_POINT_CHARS {
        return trimmed.to_string();
    }

    let shortened: String = trimmed.chars().take(MAX_POINT_CHARS - 1).collect();
    format!("{}…", shortened.trim_end())
}

fn deduplicate_scriptures(scriptures: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    scriptures
        .into_iter()
        .filter_map(|scripture| {
            let trimmed = scripture.trim();
            if trimmed.is_empty() || !seen.insert(trimmed.to_lowercase()) {
                return None;
            }
            Some(trimmed.to_string())
        })
        .collect()
}

/// Builds a concise extractive outline from transcript fragments.
///
/// # Errors
/// Returns an error when every supplied fragment is empty.
#[tauri::command]
pub fn summarize_preaching(
    segments: Vec<String>,
    scriptures: Vec<String>,
) -> Result<PreachingSummary, String> {
    let cleaned_segments: Vec<String> = segments
        .into_iter()
        .filter(|segment| !segment.trim().is_empty())
        .collect();

    if cleaned_segments.is_empty() {
        return Err("The transcript is empty".to_string());
    }

    let mut frequencies: HashMap<String, usize> = HashMap::new();
    for segment in &cleaned_segments {
        for word in meaningful_words(segment.trim()) {
            *frequencies.entry(word).or_default() += 1;
        }
    }

    let mut ranked: Vec<(usize, f64)> = cleaned_segments
        .iter()
        .enumerate()
        .map(|(index, segment)| {
            let words = meaningful_words(segment.trim());
            let frequency_score: usize = words
                .iter()
                .map(|word| frequencies.get(word).copied().unwrap_or_default())
                .sum();
            #[expect(
                clippy::cast_precision_loss,
                reason = "transcript fragment sizes are small"
            )]
            let length_normalizer = (words.len().max(1) as f64).sqrt();
            #[expect(
                clippy::cast_precision_loss,
                reason = "frequency totals are small enough for summary ranking"
            )]
            let score = frequency_score as f64 / length_normalizer;
            (index, score)
        })
        .collect();

    ranked.sort_by(|left, right| right.1.total_cmp(&left.1));
    ranked.truncate(MAX_KEY_POINTS.min(ranked.len()));
    ranked.sort_by_key(|(index, _)| *index);

    let key_points: Vec<String> = ranked
        .iter()
        .map(|(index, _)| truncate_point(&cleaned_segments[*index]))
        .collect();
    let overview = key_points
        .iter()
        .take(2)
        .cloned()
        .collect::<Vec<_>>()
        .join(" ");

    Ok(PreachingSummary {
        overview,
        key_points,
        scriptures: deduplicate_scriptures(scriptures),
    })
}
