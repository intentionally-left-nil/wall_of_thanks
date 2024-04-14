use std::env;
use tiny_http::{Response, Server};

fn start_server(port: u16) {
    let server = Server::http(("0.0.0.0", port)).unwrap();
    for request in server.incoming_requests() {
        let route = (request.method(), request.url());
        let response = match route {
            (&tiny_http::Method::Get, "/") => Response::from_string("Hello, World!"),
            _ => Response::from_string("Not Found"),
        };
        let _ = request.respond(response);
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let port = args
        .get(1)
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(8001);
    start_server(port);
}
