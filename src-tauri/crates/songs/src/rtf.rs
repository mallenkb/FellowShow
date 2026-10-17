#[derive(Clone, Copy)]
struct Group {
    skip: bool,
    hidden: bool,
    fallback_length: usize,
}

const DESTINATIONS: &[&str] = &[
    "fonttbl",
    "colortbl",
    "stylesheet",
    "info",
    "pict",
    "object",
    "header",
    "headerl",
    "headerr",
    "footer",
    "footerl",
    "footerr",
    "filetbl",
    "listtable",
    "listoverridetable",
    "generator",
    "fldinst",
    "datafield",
    "xmlnstbl",
];

fn push_char(output: &mut Vec<u16>, character: char) {
    output.extend_from_slice(character.encode_utf16(&mut [0; 2]));
}

fn ansi_character(byte: u8) -> char {
    // EasyWorship's ANSI RTF uses Windows-1252 for escaped punctuation.
    const WINDOWS_1252: [char; 32] = [
        '€', '\u{81}', '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ', '‰', 'Š', '‹', 'Œ', '\u{8d}', 'Ž',
        '\u{8f}', '\u{90}', '‘', '’', '“', '”', '•', '–', '—', '˜', '™', 'š', '›', 'œ', '\u{9d}',
        'ž', 'Ÿ',
    ];
    if (0x80..=0x9f).contains(&byte) {
        WINDOWS_1252[usize::from(byte - 0x80)]
    } else {
        char::from(byte)
    }
}

fn normalize(text: &str) -> String {
    let mut lines = Vec::new();
    let normalized = text
        .replace("\r\n", "\n")
        .replace('\r', "\n")
        .replace('\u{a0}', " ");
    for line in normalized.lines().map(str::trim) {
        if !line.is_empty()
            || lines
                .last()
                .is_some_and(|previous: &&str| !previous.is_empty())
        {
            lines.push(line);
        }
    }
    lines.join("\n").trim().to_owned()
}

fn read_control(
    first: char,
    chars: &mut std::iter::Peekable<std::str::Chars<'_>>,
) -> (String, Option<i32>) {
    let mut word = String::from(first);
    while chars.peek().is_some_and(char::is_ascii_alphabetic) {
        if let Some(next) = chars.next() {
            word.push(next);
        }
    }
    let mut parameter = String::new();
    if chars.peek() == Some(&'-') {
        parameter.push('-');
        chars.next();
    }
    while chars.peek().is_some_and(char::is_ascii_digit) {
        if let Some(next) = chars.next() {
            parameter.push(next);
        }
    }
    if chars.peek() == Some(&' ') {
        chars.next();
    }
    (word, parameter.parse::<i32>().ok())
}

/// Extracts lyric text, excluding RTF destinations and `EasyWorship` layout groups.
pub fn to_text(input: &str) -> String {
    let rtf = input.trim_start_matches('\u{feff}').trim_start();
    if !rtf.starts_with("{\\rtf") {
        return normalize(input);
    }

    let mut group = Group {
        skip: false,
        hidden: false,
        fallback_length: 1,
    };
    let mut stack = Vec::new();
    // Keeping UTF-16 units together preserves surrogate pairs in RTF \u controls.
    let mut output = Vec::<u16>::new();
    let mut fallback_remaining = 0_usize;
    let mut chars = rtf.chars().peekable();
    while let Some(character) = chars.next() {
        match character {
            '{' => {
                stack.push(group);
                fallback_remaining = 0;
            }
            '}' => {
                if let Some(previous) = stack.pop() {
                    group = previous;
                }
                fallback_remaining = 0;
            }
            '\r' | '\n' => {}
            '\\' => {
                let Some(control) = chars.next() else { break };
                if control == '*' {
                    // RTF marks vendor-specific destinations, including sdfsreal,
                    // sdasbaseline and pnseclvl, as ignorable with \*.
                    group.skip = true;
                    continue;
                }
                if !control.is_ascii_alphabetic() {
                    let decoded = match control {
                        '\'' => {
                            let hex: String = chars.by_ref().take(2).collect();
                            u8::from_str_radix(&hex, 16).ok().map(ansi_character)
                        }
                        '\\' | '{' | '}' => Some(control),
                        '~' => Some(' '),
                        '_' => Some('\u{2011}'),
                        '\n' | '\r' => Some('\n'),
                        _ => None,
                    };
                    if fallback_remaining > 0 {
                        fallback_remaining -= 1;
                    } else if !group.skip && !group.hidden {
                        if let Some(decoded) = decoded {
                            push_char(&mut output, decoded);
                        }
                    }
                    continue;
                }
                let (word, number) = read_control(control, &mut chars);
                if word == "bin" {
                    for _ in 0..number.and_then(|n| usize::try_from(n).ok()).unwrap_or(0) {
                        if chars.next().is_none() {
                            break;
                        }
                    }
                } else if DESTINATIONS.contains(&word.as_str()) {
                    group.skip = true;
                } else if !group.skip {
                    match word.as_str() {
                        "uc" => {
                            group.fallback_length =
                                number.and_then(|n| usize::try_from(n).ok()).unwrap_or(1);
                        }
                        "v" => group.hidden = number != Some(0),
                        "plain" => group.hidden = false,
                        "u" => {
                            if !group.hidden {
                                if let Some(unit) = number.and_then(|n| {
                                    u16::try_from(if n < 0 { n + 65_536 } else { n }).ok()
                                }) {
                                    output.push(unit);
                                }
                            }
                            fallback_remaining = group.fallback_length;
                        }
                        "par" | "line" | "page" if !group.hidden => output.push(10),
                        "tab" if !group.hidden => output.push(32),
                        "emdash" if !group.hidden => output.push(0x2014),
                        "endash" if !group.hidden => output.push(0x2013),
                        "lquote" if !group.hidden => output.push(0x2018),
                        "rquote" if !group.hidden => output.push(0x2019),
                        "ldblquote" if !group.hidden => output.push(0x201c),
                        "rdblquote" if !group.hidden => output.push(0x201d),
                        "bullet" if !group.hidden => output.push(0x2022),
                        _ => {}
                    }
                }
            }
            _ if fallback_remaining > 0 => fallback_remaining -= 1,
            _ if !group.skip && !group.hidden => push_char(&mut output, character),
            _ => {}
        }
    }
    normalize(&String::from_utf16_lossy(&output))
}

#[cfg(test)]
mod tests {
    use super::to_text;

    #[test]
    fn ignores_font_and_easyworship_layout_groups() {
        let input = r"{\rtf1\ansi{\fonttbl{\f0 Tahoma;}}{\colortbl;}\pard{\*\sdasfactor 1}{\*\sdfsreal 60.4799995422363}Amazing grace\par How sweet the sound}";
        assert_eq!(to_text(input), "Amazing grace\nHow sweet the sound");
    }

    #[test]
    fn preserves_unicode_and_escaped_characters() {
        let input = r"{\rtf1\uc1 Nyankop\u596?n \'93grace\'94 \{saved\} \u-10179?\u-8704?}";
        assert_eq!(to_text(input), "Nyankopɔn “grace” {saved} 😀");
    }

    #[test]
    fn preserves_paragraphs_without_source_newlines() {
        assert_eq!(
            to_text("{\\rtf1 First\\par}\r\n{\\rtf1 Second\\par}"),
            "First\nSecond"
        );
        assert_eq!(
            to_text("First\r\n\r\nSecond {repeat}"),
            "First\n\nSecond {repeat}"
        );
    }
}
