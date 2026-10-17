use super::*;
use crate::e2e_support::response_server;

fn client() -> DeepgramRestClient {
    DeepgramRestClient::new(SttConfig {
        api_key: "local-test-key".into(),
        ..SttConfig::default()
    })
}

#[tokio::test]
async fn generated_pcm_upload_returns_transcript_with_word_timestamps() {
    let body = r#"{"results":{"channels":[{"alternatives":[{"transcript":"John three sixteen","confidence":0.95,"words":[{"word":"John","start":0.0,"end":0.4,"confidence":0.99}]}]}]}}"#;
    let (endpoint, server) = response_server("200 OK", body).await;
    let events = client()
        .transcribe_url(&[i16::MIN, 0, i16::MAX], &endpoint)
        .await
        .expect("REST transcription");
    let request = server.await.expect("server joins");
    assert!(request.ends_with(&[0, 128, 0, 0, 255, 127]));
    assert!(String::from_utf8_lossy(&request).contains("Token local-test-key"));
    assert!(
        matches!(events.as_slice(), [TranscriptEvent::Final { transcript, words, speech_final: true, .. }] if transcript == "John three sixteen" && words.len() == 1 && (words[0].end - 0.4).abs() < f64::EPSILON)
    );
}

#[tokio::test]
async fn rejected_rest_requests_return_the_http_failure() {
    let (endpoint, server) =
        response_server("429 Too Many Requests", r#"{"error":"local rate limit"}"#).await;
    let error = client()
        .transcribe_url(&[123], &endpoint)
        .await
        .expect_err("rate limit must fail");
    server.await.expect("server joins");
    assert!(error.to_string().contains("429"));
}

#[tokio::test]
async fn malformed_rest_response_returns_a_parse_error() {
    let (endpoint, server) = response_server("200 OK", "not JSON").await;
    let error = client()
        .transcribe_url(&[123], &endpoint)
        .await
        .expect_err("invalid response must fail");
    server.await.expect("server joins");
    assert!(matches!(error, SttError::ParseError(_)));
}

#[tokio::test]
async fn empty_audio_never_requires_an_external_request() {
    assert!(client()
        .transcribe(&[])
        .await
        .expect("empty audio")
        .is_empty());
}
