use super::*;
use tokio::net::TcpListener;

fn client() -> Arc<DeepgramClient> {
    Arc::new(DeepgramClient::new(SttConfig {
        api_key: "local-test-key".into(),
        ..SttConfig::default()
    }))
}

fn final_result(text: &str) -> Message {
    Message::Text(
        serde_json::json!({ "type": "Results", "is_final": true,
        "speech_final": true, "channel": { "alternatives": [{ "transcript": text,
        "confidence": 0.99, "words": [] }] } })
        .to_string()
        .into(),
    )
}

#[tokio::test]
async fn server_disconnect_reconnects_and_delivers_transcripts_again() {
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind server");
    let url = Url::parse(&format!(
        "ws://{}/listen",
        listener.local_addr().expect("address")
    ))
    .expect("URL");
    let server = tokio::spawn(async move {
        let (first, _) = listener.accept().await.expect("first connection");
        let mut first = tokio_tungstenite::accept_async(first)
            .await
            .expect("first handshake");
        first.close(None).await.expect("server closes first socket");
        let (second, _) = listener.accept().await.expect("reconnection");
        let mut second = tokio_tungstenite::accept_async(second)
            .await
            .expect("second handshake");
        while let Some(message) = second.next().await {
            match message.expect("client message") {
                Message::Binary(bytes) => {
                    assert_eq!(bytes.len(), BATCH_SAMPLES * 2);
                    second
                        .send(final_result("John three sixteen"))
                        .await
                        .expect("transcript");
                }
                Message::Text(text) if text.contains("CloseStream") => {
                    second.close(None).await.expect("close stream");
                    break;
                }
                _ => {}
            }
        }
    });
    let client = client();
    let runner_client = Arc::clone(&client);
    let (audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    let (event_tx, mut event_rx) = mpsc::channel(16);
    let runner =
        tokio::spawn(async move { runner_client.connect_url(audio_rx, event_tx, &url).await });
    let flow = async {
        let mut connections = 0;
        while connections < 2 {
            if matches!(event_rx.recv().await, Some(TranscriptEvent::Connected)) {
                connections += 1;
            }
        }
        audio_tx
            .send(vec![123; BATCH_SAMPLES])
            .expect("generated PCM");
        while let Some(event) = event_rx.recv().await {
            if let TranscriptEvent::Final { transcript, .. } = event {
                assert_eq!(transcript, "John three sixteen");
                break;
            }
        }
        drop(audio_tx);
        runner
            .await
            .expect("runner joins")
            .expect("clean reconnection");
        server.await.expect("server joins");
    };
    tokio::time::timeout(Duration::from_secs(4), flow)
        .await
        .expect("reconnection completes");
}

#[tokio::test]
async fn input_close_waits_for_the_last_final_transcript() {
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind server");
    let url = Url::parse(&format!(
        "ws://{}/listen",
        listener.local_addr().expect("address")
    ))
    .expect("URL");
    let server = tokio::spawn(async move {
        let (stream, _) = listener.accept().await.expect("connection");
        let mut stream = tokio_tungstenite::accept_async(stream)
            .await
            .expect("handshake");
        let mut pcm = Vec::new();
        while let Some(message) = stream.next().await {
            match message.expect("client message") {
                Message::Binary(bytes) => pcm.extend_from_slice(&bytes),
                Message::Text(text) if text.contains("CloseStream") => {
                    assert_eq!(
                        pcm,
                        [1_i16, 2, 3]
                            .iter()
                            .flat_map(|sample| sample.to_le_bytes())
                            .collect::<Vec<_>>()
                    );
                    stream
                        .send(final_result("last buffered words"))
                        .await
                        .expect("final result");
                    stream.close(None).await.expect("server close");
                    break;
                }
                _ => {}
            }
        }
    });
    let client = client();
    let (audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    audio_tx.send(vec![1, 2, 3]).expect("PCM");
    drop(audio_tx);
    let (event_tx, mut event_rx) = mpsc::channel(8);
    tokio::time::timeout(
        Duration::from_secs(2),
        client.connect_url(audio_rx, event_tx, &url),
    )
    .await
    .expect("session finishes")
    .expect("clean close");
    server.await.expect("server joins");
    let mut finals = Vec::new();
    while let Some(event) = event_rx.recv().await {
        if let TranscriptEvent::Final { transcript, .. } = event {
            finals.push(transcript);
        }
    }
    assert_eq!(finals, ["last buffered words"]);
}

#[tokio::test]
async fn idle_socket_and_audio_reader_both_stop_without_closing_audio_input() {
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind server");
    let url = Url::parse(&format!(
        "ws://{}/listen",
        listener.local_addr().expect("address")
    ))
    .expect("URL");
    let server = tokio::spawn(async move {
        let (stream, _) = listener.accept().await.expect("connection");
        let mut stream = tokio_tungstenite::accept_async(stream)
            .await
            .expect("handshake");
        let _ = stream.next().await;
    });
    let client = client();
    let worker_client = Arc::clone(&client);
    let (audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    let (event_tx, mut event_rx) = mpsc::channel(8);
    let worker =
        tokio::spawn(async move { worker_client.connect_url(audio_rx, event_tx, &url).await });
    assert!(matches!(
        event_rx.recv().await,
        Some(TranscriptEvent::Connected)
    ));
    client.stop();
    tokio::time::timeout(Duration::from_secs(1), worker)
        .await
        .expect("stop completes")
        .expect("worker joins")
        .expect("clean stop");
    server.await.expect("server joins");
    drop(audio_tx);
}

#[tokio::test]
async fn explicit_provider_errors_are_reported_and_end_the_socket_session() {
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind server");
    let url = Url::parse(&format!(
        "ws://{}/listen",
        listener.local_addr().expect("address")
    ))
    .expect("URL");
    let server = tokio::spawn(async move {
        let (stream, _) = listener.accept().await.expect("connection");
        let mut stream = tokio_tungstenite::accept_async(stream)
            .await
            .expect("handshake");
        stream
            .send(Message::Text(
                r#"{"type":"Error","description":"Local test rejected this stream"}"#.into(),
            ))
            .await
            .expect("provider error");
        let _ = stream.next().await;
    });
    let client = client();
    let (_audio_tx, audio_rx) = crossbeam_channel::bounded(1);
    let (event_tx, mut event_rx) = mpsc::channel(8);
    let result = tokio::time::timeout(
        Duration::from_secs(1),
        client.try_connect(audio_rx, event_tx, &url),
    )
    .await
    .expect("provider error ends session");
    assert!(result.is_err());
    assert!(matches!(
        event_rx.recv().await,
        Some(TranscriptEvent::Connected)
    ));
    assert!(
        matches!(event_rx.recv().await, Some(TranscriptEvent::Error(message)) if message.contains("Local test rejected this stream"))
    );
    server.await.expect("server joins");
}
