use super::*;
use crate::e2e_support::response_server;

fn provider(endpoint: String) -> OpenAiCompatibleSttProvider {
    OpenAiCompatibleSttProvider::new(OpenAiCompatibleConfig {
        api_key: "local-test-key".into(),
        endpoint,
        model: "local-model".into(),
        provider_name: "Local test",
        sample_rate: 16_000,
    })
}

#[tokio::test]
async fn stopped_provider_does_not_start_new_requests_for_queued_audio() {
    let provider = provider("invalid://must-not-request".into());
    provider.stop();
    let (audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    audio_tx.send(vec![123; 80_000]).expect("queued PCM");
    let (event_tx, mut event_rx) = mpsc::channel(8);
    tokio::time::timeout(
        Duration::from_millis(200),
        provider.start(audio_rx, event_tx),
    )
    .await
    .expect("stopped provider must not wait for audio")
    .expect("clean cancellation");
    assert!(event_rx.try_recv().is_err());
    drop(audio_tx);
}

#[tokio::test]
async fn generated_audio_is_uploaded_as_wav_and_emits_final_transcript() {
    let (endpoint, server) = response_server(
        "200 OK",
        r#"{"text":"  John chapter three verse sixteen.  "}"#,
    )
    .await;
    let provider = provider(endpoint);
    let (audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    audio_tx
        .send(vec![i16::MIN, 0, i16::MAX])
        .expect("send PCM");
    drop(audio_tx);
    let (event_tx, mut event_rx) = mpsc::channel(8);
    tokio::time::timeout(Duration::from_secs(2), provider.start(audio_rx, event_tx))
        .await
        .expect("provider completes")
        .expect("transcription succeeds");
    let request = server.await.expect("server completes");
    let wav = encode_wav_mono_i16(&[i16::MIN, 0, i16::MAX], 16_000).expect("WAV");
    assert!(request.windows(wav.len()).any(|part| part == wav));
    assert!(String::from_utf8_lossy(&request).contains("Bearer local-test-key"));
    assert!(matches!(
        event_rx.recv().await,
        Some(TranscriptEvent::Connected)
    ));
    assert!(
        matches!(event_rx.recv().await, Some(TranscriptEvent::Final { transcript, .. }) if transcript == "John chapter three verse sixteen.")
    );
    assert!(matches!(
        event_rx.recv().await,
        Some(TranscriptEvent::Disconnected)
    ));
}

#[tokio::test]
async fn failed_final_buffer_is_reported_instead_of_silently_discarded() {
    let (endpoint, server) =
        response_server("401 Unauthorized", r#"{"error":"invalid test key"}"#).await;
    let provider = provider(endpoint);
    let (audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    audio_tx.send(vec![100; 1600]).expect("send PCM");
    drop(audio_tx);
    let (event_tx, mut event_rx) = mpsc::channel(8);
    let result = tokio::time::timeout(Duration::from_secs(2), provider.start(audio_rx, event_tx))
        .await
        .expect("provider completes");
    server.await.expect("server completes");
    assert!(
        result.is_err(),
        "provider must return the failed final request"
    );
    let mut messages = Vec::new();
    while let Some(event) = event_rx.recv().await {
        if let TranscriptEvent::Error(message) = event {
            messages.push(message);
        }
    }
    assert!(messages.iter().any(|message| message.contains("401")));
}

#[tokio::test]
async fn idle_audio_does_not_block_the_async_runtime_and_can_be_stopped() {
    let provider = Arc::new(provider("http://127.0.0.1:1/unused".into()));
    let (audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    let (event_tx, mut event_rx) = mpsc::channel(8);
    let worker_provider = Arc::clone(&provider);
    let worker = tokio::spawn(async move { worker_provider.start(audio_rx, event_tx).await });
    assert!(matches!(
        event_rx.recv().await,
        Some(TranscriptEvent::Connected)
    ));
    provider.stop();
    tokio::time::timeout(Duration::from_secs(1), worker)
        .await
        .expect("provider stops")
        .expect("worker joins")
        .expect("clean shutdown");
    drop(audio_tx);
}
