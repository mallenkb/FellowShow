use std::time::{Duration, Instant};

use super::automaton::BookMatcher;
use super::context::ReferenceContext;
use super::parser::{consume_number, parse_reference, tokenize, Token};
use crate::types::VerseRef;

/// A verse request may be followed by its book/chapter in a later speech chunk.
#[derive(Default)]
pub(super) struct Conversation {
    pending: Option<(VerseRef, Instant)>,
}

fn word(token: &Token, expected: &str) -> bool {
    matches!(token, Token::Word(value) if value == expected)
}

/// Only explicit verse words or correction phrases can introduce verse numbers.
/// Ordinary numbers in the sermon must not become navigation commands.
fn requested_verses(text: &str, allow_correction: bool) -> Option<(i32, Option<i32>)> {
    let tokens = tokenize(text);
    let mut request = None;
    for (index, token) in tokens.iter().enumerate() {
        let correction = allow_correction
            && (word(token, "sorry") || word(token, "rather") || word(token, "mean"));
        if !word(token, "verse") && !word(token, "verses") && !correction {
            continue;
        }
        let Some((start, next)) = consume_number(&tokens, index + 1) else {
            continue;
        };
        if !(1..=176).contains(&start) {
            continue;
        }
        let end = tokens.get(next).and_then(|separator| {
            let adjacent = word(separator, "and");
            if !adjacent
                && !word(separator, "to")
                && !word(separator, "through")
                && !matches!(separator, Token::Dash)
            {
                return None;
            }
            let skip = usize::from(
                tokens
                    .get(next + 1)
                    .is_some_and(|t| word(t, "verse") || word(t, "verses")),
            );
            let (end, _) = consume_number(&tokens, next + 1 + skip)?;
            // "34 and 35" is contiguous. Do not silently include verses between
            // two separate requests such as "34 and 38".
            (end > start && end <= 176 && (!adjacent || end == start + 1)).then_some(end)
        });
        request = Some((start, end));
    }
    request
}

impl Conversation {
    pub(super) fn resolve(
        &mut self,
        text: &str,
        matcher: &BookMatcher,
        context: &ReferenceContext,
    ) -> Option<VerseRef> {
        if self
            .pending
            .as_ref()
            .is_some_and(|(_, at)| at.elapsed() > Duration::from_secs(45))
        {
            self.pending = None;
        }
        let books = matcher.find_books(text);
        // Require a number immediately after a named book, avoiding ordinary
        // words that also happen to be short Bible-book aliases.
        let named = books
            .iter()
            .enumerate()
            .filter_map(|(index, book)| {
                let until = books.get(index + 1).map_or(text.len(), |next| next.start);
                let tokens = tokenize(&text[book.end..until]);
                let skip = usize::from(tokens.first().is_some_and(|t| word(t, "chapter")));
                consume_number(&tokens, skip)?;
                let reference = parse_reference(&text[..until], book)?;
                Some((book, reference))
            })
            .next_back();

        let prior = context.resolve(&VerseRef {
            book_number: 0,
            book_name: String::new(),
            chapter: 0,
            verse_start: 0,
            verse_end: None,
        });
        let mut request = requested_verses(text, prior.chapter > 0 || self.pending.is_some());
        if request.is_none() {
            if let Some((pending, _)) = &self.pending {
                let tokens = tokenize(text);
                if tokens.first().is_some_and(|token| {
                    word(token, "and") || word(token, "through") || word(token, "to")
                }) {
                    if let Some((end, _)) = consume_number(&tokens, 1) {
                        if end > pending.verse_start
                            && end <= 176
                            && (!word(&tokens[0], "and")
                                || end == pending.verse_end.unwrap_or(pending.verse_start) + 1)
                        {
                            request = Some((pending.verse_start, Some(end)));
                        }
                    }
                }
            }
        }
        if let Some((start, end)) = request {
            let mut reference = named.as_ref().map_or_else(
                || {
                    context.resolve(&VerseRef {
                        book_number: 0,
                        book_name: String::new(),
                        chapter: 0,
                        verse_start: start,
                        verse_end: end,
                    })
                },
                |(_, reference)| reference.clone(),
            );
            // If a complete newer reference follows the verse request, let
            // the regular parser handle it rather than borrowing its chapter.
            if let Some((book, named_ref)) = &named {
                if named_ref.verse_start > 0 && requested_verses(&text[book.end..], false).is_none()
                {
                    self.pending = None;
                    return None;
                }
            }
            reference.verse_start = start;
            reference.verse_end = end;
            self.pending = Some((reference.clone(), Instant::now()));
            return Some(reference);
        }

        if let Some((book, named_ref)) = named {
            if named_ref.verse_start > 0 {
                self.pending = None;
                return None;
            }
            let (pending, _) = self.pending.as_ref()?;
            let prefix = text[..book.start].to_lowercase();
            let clarifying = pending.book_number == 0
                || pending.chapter == 0
                || prefix
                    .split_whitespace()
                    .any(|part| matches!(part, "same" | "sorry" | "rather" | "mean"));
            if clarifying {
                let mut reference = named_ref;
                reference.verse_start = pending.verse_start;
                reference.verse_end = pending.verse_end;
                self.pending = None;
                return Some(reference);
            }
            self.pending = None;
        }
        None
    }
}
