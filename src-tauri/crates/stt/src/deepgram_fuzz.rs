use super::*;

#[tokio::test]
async fn generated_provider_messages_preserve_transcript_and_event_kind() {
    let pieces = [
        "God", "ɔ", "e\u{301}", "🙂", "中", "\0", "\n", "\"", "\\", " ",
    ];
    let (tx, mut rx) = mpsc::channel(8);
    for case in 0..10_000 {
        let transcript: String = (0..=case % 20)
            .map(|i| pieces[(case + i) % pieces.len()])
            .collect();
        let is_final = case % 2 == 0;
        let message = serde_json::json!({ "type": "Results", "is_final": is_final, "speech_final": true,
            "channel": { "alternatives": [{ "transcript": transcript, "confidence": 0.9,
                "words": [{"word": "God", "start": 0, "end": 1, "confidence": 1}] }] } });
        parse_and_send(&message.to_string(), &tx)
            .await
            .expect("valid message");
        let event = rx.try_recv().expect("one transcript event");
        match event {
            TranscriptEvent::Final {
                transcript: actual,
                words,
                ..
            } if is_final => {
                assert_eq!(actual, transcript, "case={case}");
                assert_eq!(words.len(), 1);
            }
            TranscriptEvent::Partial {
                transcript: actual,
                words,
            } if !is_final => {
                assert_eq!(actual, transcript, "case={case}");
                assert_eq!(words.len(), 1);
            }
            other => panic!("case={case} unexpected event {other:?}"),
        }
    }
}

#[tokio::test]
async fn malformed_provider_messages_fail_or_are_ignored_without_panics() {
    let (tx, mut rx) = mpsc::channel(8);
    let mut seed = 0x5eed_2026_u32;
    for case in 0..10_000 {
        seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        let malformed = match case % 6 {
            0 => format!("{{\"type\":\"Results\",\"channel\":{seed}}}"),
            1 => format!("{{\"type\":\"Results\",\"channel\":{{\"alternatives\":[{seed}]}}}}"),
            2 => format!("{{\"type\":\"Results\",\"channel\":{{\"alternatives\":[{{\"words\":[null,{seed},{{}}]}}]}}}}"),
            3 => format!("{{\"unknown\":{seed}}}"),
            4 => format!("[null, {seed}, \"🙂\"]"),
            _ => format!("{{\"type\":\"Results\",{seed}"),
        };
        let result = parse_and_send(&malformed, &tx).await;
        if case % 6 == 5 {
            assert!(result.is_err());
        }
        while rx.try_recv().is_ok() {}
    }
}
