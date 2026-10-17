use super::*;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[tokio::test]
async fn session_cancelled_before_start_does_not_activate_the_provider() {
    let provider = OpenAiCompatibleSttProvider::new(OpenAiCompatibleConfig {
        api_key: "local-test-key".into(),
        endpoint: "invalid://must-not-request".into(),
        model: "test-model".into(),
        provider_name: "Local test",
        sample_rate: 16_000,
    });
    let (_audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    let (event_tx, mut event_rx) = tokio::sync::mpsc::channel(8);
    let cancelled = AtomicBool::new(true);
    tokio::time::timeout(
        Duration::from_millis(200),
        run_stt_provider(&provider, audio_rx, event_tx, &cancelled),
    )
    .await
    .expect("pre-cancelled session must not start")
    .expect("clean cancellation");
    assert!(event_rx.try_recv().is_err());
}

#[tokio::test]
async fn session_stop_cancels_an_in_flight_transcription_request() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind local server");
    let endpoint = format!(
        "http://{}/transcribe",
        listener.local_addr().expect("address")
    );
    let (accepted_tx, accepted_rx) = tokio::sync::oneshot::channel();
    let server = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.expect("accept request");
        let mut byte = [0];
        stream.read_exact(&mut byte).await.expect("request begins");
        accepted_tx.send(()).expect("request accepted");
        let mut bytes = Vec::new();
        let _ = stream.read_to_end(&mut bytes).await;
    });
    let provider = OpenAiCompatibleSttProvider::new(OpenAiCompatibleConfig {
        api_key: "local-test-key".into(),
        endpoint,
        model: "test-model".into(),
        provider_name: "Local test",
        sample_rate: 16_000,
    });
    let (audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    audio_tx.send(vec![123; 16_000 * 5]).expect("generated PCM");
    let (event_tx, _event_rx) = tokio::sync::mpsc::channel(8);
    let cancelled = Arc::new(AtomicBool::new(false));
    let runner_cancelled = Arc::clone(&cancelled);
    let runner = tokio::spawn(async move {
        run_stt_provider(&provider, audio_rx, event_tx, &runner_cancelled).await
    });
    accepted_rx
        .await
        .expect("HTTP request reached local server");
    cancelled.store(true, Ordering::SeqCst);
    tokio::time::timeout(STT_SHUTDOWN_GRACE + Duration::from_secs(1), runner)
        .await
        .expect("session stops promptly")
        .expect("runner joins")
        .expect("clean stop");
    tokio::time::timeout(Duration::from_secs(1), server)
        .await
        .expect("request socket is released")
        .expect("server joins");
    drop(audio_tx);
}

#[tokio::test]
async fn session_stop_delivers_captured_partial_audio_before_finishing() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind local server");
    let endpoint = format!(
        "http://{}/transcribe",
        listener.local_addr().expect("address")
    );
    let server = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.expect("accept final request");
        let mut request = Vec::new();
        loop {
            let count = stream.read_buf(&mut request).await.expect("read request");
            assert!(count > 0, "provider must send its final audio body");
            if let Some(header_end) = request.windows(4).position(|bytes| bytes == b"\r\n\r\n") {
                let headers = String::from_utf8_lossy(&request[..header_end]);
                let length = headers
                    .lines()
                    .find_map(|line| {
                        let (name, value) = line.split_once(':')?;
                        name.eq_ignore_ascii_case("content-length")
                            .then(|| value.trim().parse::<usize>().expect("content length"))
                    })
                    .expect("request content length");
                if request.len() >= header_end + 4 + length {
                    break;
                }
            }
        }
        assert!(request.windows(4).any(|bytes| bytes == b"RIFF"));
        let body = r#"{"text":"captured final words"}"#;
        let response = format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
        stream
            .write_all(response.as_bytes())
            .await
            .expect("final response");
    });
    let provider = OpenAiCompatibleSttProvider::new(OpenAiCompatibleConfig {
        api_key: "local-test-key".into(),
        endpoint,
        model: "test-model".into(),
        provider_name: "Local test",
        sample_rate: 16_000,
    });
    let (audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    audio_tx
        .send(vec![123; 1600])
        .expect("captured partial PCM");
    let (event_tx, mut event_rx) = tokio::sync::mpsc::channel(8);
    let cancelled = Arc::new(AtomicBool::new(false));
    let runner_cancelled = Arc::clone(&cancelled);
    let runner = tokio::spawn(async move {
        run_stt_provider(&provider, audio_rx, event_tx, &runner_cancelled).await
    });
    assert!(matches!(
        event_rx.recv().await,
        Some(TranscriptEvent::Connected)
    ));
    cancelled.store(true, Ordering::SeqCst);
    // The native capture thread closes this sender when it sees session cancellation.
    drop(audio_tx);
    tokio::time::timeout(Duration::from_secs(1), runner)
        .await
        .expect("responsive provider drains before the grace expires")
        .expect("runner joins")
        .expect("clean final flush");
    server.await.expect("server joins");
    assert!(
        matches!(event_rx.recv().await, Some(TranscriptEvent::Final { transcript, .. }) if transcript == "captured final words")
    );
    assert!(matches!(
        event_rx.recv().await,
        Some(TranscriptEvent::Disconnected)
    ));
}

#[tokio::test]
async fn provider_startup_errors_reach_the_session_owner() {
    let (event_tx, _event_rx) = tokio::sync::mpsc::channel(8);
    let cancelled = AtomicBool::new(false);
    let provider = OpenAiCompatibleSttProvider::new(OpenAiCompatibleConfig {
        api_key: "local-test-key".into(),
        endpoint: "invalid://local".into(),
        model: "test-model".into(),
        provider_name: "Local test",
        sample_rate: 1,
    });
    let (source_tx, source_rx) = crossbeam_channel::bounded(1);
    source_tx.send(vec![1; 5]).expect("PCM");
    drop(source_tx);
    let result = run_stt_provider(&provider, source_rx, event_tx, &cancelled).await;
    assert!(result.is_err());
}
