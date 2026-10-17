use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

pub(crate) async fn response_server(
    status: &str,
    body: &str,
) -> (String, tokio::task::JoinHandle<Vec<u8>>) {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind test server");
    let address = listener.local_addr().expect("test address");
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let server = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.expect("accept request");
        let mut request = Vec::new();
        let mut bytes = [0; 4096];
        loop {
            let count = stream.read(&mut bytes).await.expect("read request");
            if count == 0 {
                break;
            }
            request.extend_from_slice(&bytes[..count]);
            if let Some(header_end) = request.windows(4).position(|part| part == b"\r\n\r\n") {
                let headers = String::from_utf8_lossy(&request[..header_end]);
                let content_length = headers
                    .lines()
                    .find_map(|line| {
                        let (name, value) = line.split_once(':')?;
                        name.eq_ignore_ascii_case("content-length")
                            .then(|| value.trim().parse::<usize>().expect("content length"))
                    })
                    .expect("multipart content length");
                if request.len() >= header_end + 4 + content_length {
                    break;
                }
            }
        }
        stream
            .write_all(response.as_bytes())
            .await
            .expect("write response");
        request
    });
    (format!("http://{address}/audio/transcriptions"), server)
}
