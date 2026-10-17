#![cfg(feature = "whisper")]

use std::path::PathBuf;
use std::time::Duration;

use fellowshow_stt::{SttProvider, TranscriptEvent, WhisperProvider};
use tokio::sync::mpsc;

#[tokio::test]
async fn stopped_provider_does_not_load_a_model_or_report_connected() {
    let provider = WhisperProvider::new(PathBuf::from("missing-stopped-test-model.bin"), None, 1);
    provider.stop();
    let (_audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    let (event_tx, mut event_rx) = mpsc::channel(8);
    provider
        .start(audio_rx, event_tx)
        .await
        .expect("stopped provider stays stopped");
    assert!(event_rx.try_recv().is_err());
}

#[tokio::test]
async fn missing_model_fails_before_reporting_connected() {
    let path =
        std::env::temp_dir().join(format!("fellowshow-missing-model-{}", std::process::id()));
    let provider = WhisperProvider::new(path, None, 1);
    let (_audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    let (event_tx, mut event_rx) = mpsc::channel(8);
    let result = provider.start(audio_rx, event_tx).await;
    assert!(result.is_err());
    assert!(event_rx.try_recv().is_err());
}

#[tokio::test]
async fn corrupt_model_releases_audio_worker_and_reports_the_error() {
    let path = std::env::temp_dir().join(format!(
        "fellowshow-corrupt-model-{}.bin",
        std::process::id()
    ));
    std::fs::write(&path, b"This is not a Whisper model.").expect("write corrupt fixture");
    let provider = WhisperProvider::new(path.clone(), None, 1);
    let (_audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    let (event_tx, mut event_rx) = mpsc::channel(8);
    let result = tokio::time::timeout(Duration::from_secs(15), provider.start(audio_rx, event_tx))
        .await
        .expect("model failure must stop the audio worker");
    std::fs::remove_file(path).expect("remove fixture");
    assert!(result.is_err());
    let mut events = Vec::new();
    while let Some(event) = event_rx.recv().await {
        events.push(event);
    }
    assert!(!events
        .iter()
        .any(|event| matches!(event, TranscriptEvent::Connected)));
    assert!(events.iter().any(|event| matches!(event, TranscriptEvent::Error(message) if message.contains("Whisper model"))));
    assert!(matches!(events.last(), Some(TranscriptEvent::Disconnected)));
}

#[tokio::test]
#[ignore = "requires an explicitly supplied public test model and generated PCM fixture"]
async fn generated_speech_runs_through_vad_and_real_whisper_inference() {
    let model =
        PathBuf::from(std::env::var_os("FELLOWSHOW_TEST_WHISPER_MODEL").expect("test model path"));
    let pcm =
        std::fs::read(std::env::var_os("FELLOWSHOW_TEST_WHISPER_PCM").expect("test PCM path"))
            .expect("read generated PCM");
    let samples: Vec<i16> = pcm
        .chunks_exact(2)
        .map(|bytes| i16::from_le_bytes([bytes[0], bytes[1]]))
        .collect();
    let provider = WhisperProvider::new(model, Some("en".into()), 4);
    let (audio_tx, audio_rx) = crossbeam_channel::unbounded();
    for chunk in samples.chunks(1024) {
        audio_tx
            .send(chunk.to_vec())
            .expect("generated audio frame");
    }
    drop(audio_tx);
    let (event_tx, mut event_rx) = mpsc::channel(64);
    tokio::time::timeout(Duration::from_secs(90), provider.start(audio_rx, event_tx))
        .await
        .expect("inference completes")
        .expect("real Whisper pipeline succeeds");
    let mut transcript = String::new();
    while let Some(event) = event_rx.recv().await {
        if let TranscriptEvent::Final {
            transcript: text, ..
        } = event
        {
            transcript.push_str(&text);
            transcript.push(' ');
        }
    }
    println!("Generated speech transcript: {transcript}");
    let transcript = transcript.to_lowercase();
    assert!(
        transcript.contains("for god so loved the world"),
        "expected generated spoken phrase: {transcript}"
    );
    assert!(
        transcript.contains("john")
            && (transcript.contains("sixteen") || transcript.contains("16")),
        "expected spoken reference: {transcript}"
    );
}

#[tokio::test]
#[ignore = "requires an explicitly supplied public test model and generated PCM fixture"]
async fn running_whisper_inference_can_be_stopped_without_an_error() {
    let model =
        PathBuf::from(std::env::var_os("FELLOWSHOW_TEST_WHISPER_MODEL").expect("test model path"));
    let pcm =
        std::fs::read(std::env::var_os("FELLOWSHOW_TEST_WHISPER_PCM").expect("test PCM path"))
            .expect("read generated PCM");
    let samples: Vec<i16> = pcm
        .chunks_exact(2)
        .map(|bytes| i16::from_le_bytes([bytes[0], bytes[1]]))
        .collect();
    let provider = std::sync::Arc::new(WhisperProvider::new(model, Some("en".into()), 4));
    let runner_provider = std::sync::Arc::clone(&provider);
    let (audio_tx, audio_rx) = crossbeam_channel::unbounded();
    for _ in 0..5 {
        for chunk in samples.chunks(1024) {
            audio_tx.send(chunk.to_vec()).expect("generated frame");
        }
    }
    let (event_tx, mut event_rx) = mpsc::channel(64);
    let runner = tokio::spawn(async move { runner_provider.start(audio_rx, event_tx).await });
    tokio::time::timeout(Duration::from_secs(30), async {
        while !matches!(event_rx.recv().await, Some(TranscriptEvent::Connected)) {}
    })
    .await
    .expect("model becomes ready");
    tokio::time::sleep(Duration::from_millis(50)).await;
    provider.stop();
    tokio::time::timeout(Duration::from_secs(3), runner)
        .await
        .expect("running inference stops promptly")
        .expect("runner joins")
        .expect("cancellation is a clean stop");
    while let Some(event) = event_rx.recv().await {
        assert!(
            !matches!(event, TranscriptEvent::Error(_)),
            "manual stop must not report inference failure"
        );
    }
    drop(audio_tx);
}
