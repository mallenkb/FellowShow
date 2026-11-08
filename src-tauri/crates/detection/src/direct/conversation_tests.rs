use super::detector::DirectDetector;

#[test]
fn verse_first_request_uses_the_later_book_and_chapter() {
    let mut detector = DirectDetector::new();
    let result =
        detector.detect("Let's read verse 30. In fact, let's read verse 34 and 35. Same Job 38.");
    assert_eq!(result.len(), 1);
    let reference = &result[0].verse_ref;
    assert_eq!(
        (
            reference.book_number,
            reference.chapter,
            reference.verse_start,
            reference.verse_end
        ),
        (18, 38, 34, Some(35))
    );
}

#[test]
fn pending_range_is_resolved_across_final_transcript_chunks() {
    let mut detector = DirectDetector::new();
    assert!(detector.detect("Let's read verse 30.").is_empty());
    assert!(detector
        .detect("In fact, let's read verse 34 and 35.")
        .is_empty());
    let result = detector.detect("Same Job 38.");
    assert_eq!(result.len(), 1);
    assert_eq!(result[0].verse_ref.verse_start, 34);
    assert_eq!(result[0].verse_ref.verse_end, Some(35));
    assert_eq!(result[0].verse_ref.book_number, 18);
}

#[test]
fn correction_changes_the_current_passage_without_a_repeated_book() {
    let mut detector = DirectDetector::new();
    detector.detect("Job 38:30");
    let result = detector.detect("In fact let's read verse thirty four and thirty five.");
    assert_eq!(result.len(), 1);
    assert_eq!(result[0].verse_ref.chapter, 38);
    assert_eq!(result[0].verse_ref.verse_end, Some(35));
    let correction = detector.detect("Sorry, 36.");
    assert_eq!(correction[0].verse_ref.verse_start, 36);
    assert_eq!(correction[0].verse_ref.verse_end, None);
}

#[test]
fn later_book_clarification_can_correct_the_previous_context() {
    let mut detector = DirectDetector::new();
    detector.detect("John 3:16");
    detector.detect("Verse 34 and 35");
    let result = detector.detect("Same Job 38");
    assert_eq!(result[0].verse_ref.book_number, 18);
    assert_eq!(result[0].verse_ref.chapter, 38);
    assert_eq!(result[0].verse_ref.verse_end, Some(35));
}

#[test]
fn new_book_does_not_complete_an_old_incomplete_reference() {
    let mut detector = DirectDetector::new();
    detector.detect("Genesis 3");
    let result = detector.detect("John 1:14");
    assert_eq!(result[0].verse_ref.book_number, 43);
    assert_eq!(result[0].verse_ref.chapter, 1);
}

#[test]
fn ordinary_numbers_and_commentary_do_not_navigate() {
    let mut detector = DirectDetector::new();
    detector.detect("Job 38:34");
    assert!(detector
        .detect("There are 35 people here. I like what he says.")
        .is_empty());
    assert_eq!(
        detector.detect_translation_command("This message is for you"),
        None
    );
    assert_eq!(
        detector.detect_translation_command("The fish were in the net"),
        None
    );
    assert_eq!(
        detector.detect_translation_command("We bring good news to everyone"),
        None
    );
}

#[test]
fn latest_translation_preference_wins_without_confusing_nkjv_and_kjv() {
    let detector = DirectDetector::new();
    assert_eq!(
        detector.detect_translation_command("KJV, actually I prefer NIV"),
        Some("NIV".into())
    );
    assert_eq!(
        detector.detect_translation_command("I prefer the New King James Version"),
        Some("NKJV".into())
    );
    assert_eq!(
        detector.detect_translation_command("KJV says can you lift up your voice"),
        Some("KJV".into())
    );
}
