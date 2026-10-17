use std::fmt::Write;

// Compile the actual private parser without changing its production visibility.
#[path = "../src/rtf.rs"]
mod rtf;

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
fn malformed_rtf_remains_bounded_and_does_not_panic() {
    const PIECES: &[&str] = &[
        "{",
        "}",
        "\\",
        "\\par ",
        "\\line ",
        "\\uc0 ",
        "\\uc999999999999 ",
        "\\u-32768?",
        "\\u32767?",
        "\\u-2147483648?",
        "\\u2147483647?",
        "\\bin2147483647 ",
        "\\bin-1 ",
        "\\'ff",
        "\\'xz",
        "\\'",
        "\\*\\unknown ",
        "\\fonttbl ",
        "\\v ",
        "\\v0 ",
        "\\plain ",
        "🙂",
        "ɔ",
        "e\u{301}",
        "中",
        "\0",
        "\r\n",
        "Lyrics",
        " ",
    ];
    let mut random = Random(0x5eed_2028);
    for iteration in 0..10_000 {
        let mut input = String::from("{\\rtf1 ");
        for _ in 0..random.next(80) {
            input.push_str(PIECES[random.next(PIECES.len())]);
        }
        let output = rtf::to_text(&input);
        assert!(
            output.chars().count() <= input.chars().count(),
            "seed=0x5eed2028 case={iteration} output expansion for {input:?}"
        );
    }
}

#[test]
fn escaped_unicode_lyrics_round_trip_without_losing_characters() {
    const CHARACTERS: &[char] = &['A', 'z', 'ɔ', 'Ɛ', 'é', '中', '🙂', '{', '}', '\\'];
    let mut random = Random(0x5eed_2029);
    for iteration in 0..1_000 {
        let text: String = (0..=random.next(80))
            .map(|_| CHARACTERS[random.next(CHARACTERS.len())])
            .collect();
        let mut input = String::from("{\\rtf1\\uc1 ");
        for unit in text.encode_utf16() {
            let signed = i16::from_ne_bytes(unit.to_ne_bytes());
            write!(input, "\\u{signed}?").expect("writing to a String");
        }
        input.push('}');
        assert_eq!(
            rtf::to_text(&input),
            text,
            "seed=0x5eed2029 case={iteration}"
        );
    }
}
