use fellowshow_detection::direct::{automaton::BookMatcher, books::BOOKS, parser::parse_reference};

struct Random(u64);

impl Random {
    fn next(&mut self, maximum: usize) -> usize {
        self.0 = self
            .0
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1);
        usize::try_from(self.0 % u64::try_from(maximum).expect("small bound"))
            .expect("bounded random number")
    }
}

#[test]
fn generated_references_preserve_book_chapter_and_verse() {
    let book_finder = BookMatcher::new();
    let mut random = Random(0x5eed_2026);
    for iteration in 0..10_000 {
        let book = &BOOKS[random.next(BOOKS.len())];
        let chapter = i32::try_from(random.next(10) + 1).expect("small chapter");
        let verse = i32::try_from(random.next(20) + 1).expect("small verse");
        let text = match random.next(3) {
            0 => format!("🙂 {} {chapter}:{verse}", book.name),
            1 => format!("{} chapter {chapter} verse {verse}", book.name),
            _ => format!("{} {chapter} {verse}", book.name),
        };
        let found = book_finder.find_books(&text);
        let book_match = found
            .first()
            .unwrap_or_else(|| panic!("seed=0x5eed2026 case={iteration} missing book in {text:?}"));
        let reference = parse_reference(&text, book_match).unwrap_or_else(|| {
            panic!("seed=0x5eed2026 case={iteration} missing reference in {text:?}")
        });
        assert_eq!(
            (
                reference.book_number,
                reference.chapter,
                reference.verse_start
            ),
            (book.number, chapter, verse),
            "seed=0x5eed2026 case={iteration} input={text:?}"
        );
    }
}

#[test]
fn malformed_unicode_transcripts_do_not_panic() {
    const PIECES: &[&str] = &[
        "John",
        "1 Peter",
        "Genesis",
        "chapter",
        "verse",
        "one",
        "hundred",
        "zero",
        "2147483647",
        "2147483648",
        "999999999999999999999999999",
        ":",
        "-",
        " ",
        "\0",
        "\n",
        "\r",
        "🙂",
        "ɔ",
        "e\u{301}",
        "中",
        "\u{202e}",
        "{",
        "\\",
    ];
    let book_finder = BookMatcher::new();
    let mut random = Random(0x5eed_2027);
    for iteration in 0..10_000 {
        let text: String = (0..random.next(80))
            .map(|_| PIECES[random.next(PIECES.len())])
            .collect();
        for book_match in book_finder.find_books(&text) {
            assert!(
                text.is_char_boundary(book_match.start) && text.is_char_boundary(book_match.end),
                "seed=0x5eed2027 case={iteration} invalid match offsets"
            );
            let _ = parse_reference(&text, &book_match);
        }
    }
}
