use std::sync::{mpsc, Arc};
use std::time::Duration;

use fellowshow_api::{
    new_shared_status, start_http_server, start_osc_listener, CommandError, CommandSink,
    HttpConfig, OscConfig,
};
use rosc::{OscBundle, OscMessage, OscPacket, OscTime, OscType};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

struct RecordingSink(mpsc::Sender<(String, serde_json::Value)>);

impl CommandSink for RecordingSink {
    fn emit_event(&self, event: &str, payload: &str) -> Result<(), CommandError> {
        let value = serde_json::from_str(payload)
            .map_err(|error| CommandError::DispatchFailed(error.to_string()))?;
        self.0
            .send((event.to_owned(), value))
            .map_err(|error| CommandError::DispatchFailed(error.to_string()))
    }

    fn invoke_backend(&self, action: &str, payload: &str) -> Result<(), CommandError> {
        self.emit_event(action, payload)
    }
}

async fn request(port: u16, path: &str, body: Option<&str>) -> String {
    tokio::time::timeout(Duration::from_secs(3), async {
        let mut stream = tokio::net::TcpStream::connect(("127.0.0.1", port))
            .await
            .unwrap();
        let method = if body.is_some() { "POST" } else { "GET" };
        let content = body.unwrap_or("");
        let bytes = format!(
            "{method} {path} HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{content}",
            content.len()
        );
        stream.write_all(bytes.as_bytes()).await.unwrap();
        let mut response = String::new();
        stream.read_to_string(&mut response).await.unwrap();
        response
    })
    .await
    .expect("HTTP server must respond promptly")
}

#[tokio::test]
async fn http_socket_dispatches_all_commands_and_serves_updated_status() {
    let (sender, receiver) = mpsc::channel();
    let status = new_shared_status();
    let mut server = start_http_server(
        HttpConfig {
            port: 0,
            ..HttpConfig::default()
        },
        Arc::new(RecordingSink(sender)),
        status.clone(),
    )
    .await
    .unwrap();

    let cases = [
        (
            r#"{"command":"next"}"#,
            "remote:next",
            serde_json::json!({}),
        ),
        (
            r#"{"command":"prev"}"#,
            "remote:prev",
            serde_json::json!({}),
        ),
        (
            r#"{"command":"show"}"#,
            "show_broadcast",
            serde_json::json!({}),
        ),
        (
            r#"{"command":"hide"}"#,
            "hide_broadcast",
            serde_json::json!({}),
        ),
        (
            r#"{"command":"theme","value":"Unicode 🙂"}"#,
            "remote:theme",
            serde_json::json!({"name":"Unicode 🙂"}),
        ),
        (
            r#"{"command":"opacity","value":0.25}"#,
            "remote:opacity",
            serde_json::json!({"value":0.25}),
        ),
        (
            r#"{"command":"confidence","value":0.5}"#,
            "set_confidence",
            serde_json::json!({"value":0.5}),
        ),
        (
            r#"{"command":"on_air","value":true}"#,
            "remote:on_air",
            serde_json::json!({"active":true}),
        ),
    ];
    for (index, (body, event, expected)) in cases.into_iter().enumerate() {
        let path = if index % 2 == 0 {
            "/api/v1/command"
        } else {
            "/api/v1/control"
        };
        let response = request(server.bound_port, path, Some(body)).await;
        assert!(response.starts_with("HTTP/1.1 200"), "{response}");
        assert_eq!(receiver.try_recv().unwrap(), (event.to_owned(), expected));
    }

    {
        let mut snapshot = status.write().await;
        snapshot.on_air = true;
        snapshot.live_verse = Some("John 3:16".to_owned());
        snapshot.queue_length = 2;
    }
    let response = request(server.bound_port, "/api/v1/status", None).await;
    let (_, body) = response.split_once("\r\n\r\n").unwrap();
    let snapshot: serde_json::Value = serde_json::from_str(body).unwrap();
    assert_eq!(snapshot["live_verse"], "John 3:16");
    assert_eq!(snapshot["queue_length"], 2);
    assert_eq!(snapshot["on_air"], true);
    server.handle.stop();
}

#[tokio::test]
async fn http_socket_rejects_invalid_numeric_controls_without_dispatch() {
    let (sender, receiver) = mpsc::channel();
    let server = start_http_server(
        HttpConfig {
            port: 0,
            ..HttpConfig::default()
        },
        Arc::new(RecordingSink(sender)),
        new_shared_status(),
    )
    .await
    .unwrap();
    for command in ["opacity", "confidence"] {
        for value in ["-0.1", "1.1", "1e100", "-1e100", "null", "\"NaN\""] {
            let body = format!(r#"{{"command":"{command}","value":{value}}}"#);
            let response = request(server.bound_port, "/api/v1/command", Some(&body)).await;
            assert!(
                response.starts_with("HTTP/1.1 4"),
                "Invalid {body} accepted: {response}"
            );
            assert!(receiver.try_recv().is_err(), "Invalid {body} dispatched");
        }
    }
    let response = request(server.bound_port, "/api/v1/health", None).await;
    assert!(response.starts_with("HTTP/1.1 200"), "{response}");
}

#[test]
fn osc_socket_dispatches_nested_bundles_and_recovers_after_malformed_packets() {
    let (sender, receiver) = mpsc::channel();
    let mut listener = start_osc_listener(
        OscConfig {
            port: 0,
            ..OscConfig::default()
        },
        Arc::new(RecordingSink(sender)),
    )
    .unwrap();
    let socket = std::net::UdpSocket::bind(("127.0.0.1", 0)).unwrap();
    let target = ("127.0.0.1", listener.bound_port);
    for invalid in [&b"malformed OSC"[..], &[0_u8; 32][..]] {
        socket.send_to(invalid, target).unwrap();
    }
    let message = |address: &str, args| {
        OscPacket::Message(OscMessage {
            addr: address.to_owned(),
            args,
        })
    };
    let packet = OscPacket::Bundle(OscBundle {
        timetag: OscTime {
            seconds: 0,
            fractional: 1,
        },
        content: vec![
            message("/fellowshow/opacity", vec![OscType::Float(f32::NAN)]),
            message("/unknown", vec![]),
            message("/fellowshow/next", vec![]),
            OscPacket::Bundle(OscBundle {
                timetag: OscTime {
                    seconds: 0,
                    fractional: 1,
                },
                content: vec![
                    message("/fellowshow/opacity", vec![OscType::Int(25)]),
                    message(
                        "/fellowshow/theme",
                        vec![OscType::String("Unicode 🙂".to_owned())],
                    ),
                    message(
                        "/fellowshow/on_air",
                        vec![OscType::String("off".to_owned())],
                    ),
                    message("/fellowshow/confidence", vec![OscType::Double(0.5)]),
                ],
            }),
        ],
    });
    socket
        .send_to(&rosc::encoder::encode(&packet).unwrap(), target)
        .unwrap();
    let expected = [
        ("remote:next", serde_json::json!({})),
        ("remote:opacity", serde_json::json!({"value":0.25})),
        ("remote:theme", serde_json::json!({"name":"Unicode 🙂"})),
        ("remote:on_air", serde_json::json!({"active":false})),
        ("set_confidence", serde_json::json!({"value":0.5})),
    ];
    for (event, payload) in expected {
        assert_eq!(
            receiver.recv_timeout(Duration::from_secs(3)).unwrap(),
            (event.to_owned(), payload)
        );
    }
    assert!(receiver.try_recv().is_err());
    listener.handle.stop();
    assert!(
        std::net::UdpSocket::bind(target).is_ok(),
        "Stopped listener must release its port"
    );
}
