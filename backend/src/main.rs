use serde;
use serde_json;
use sqlite;
use std::env;
use std::error::Error;
use std::io::Cursor;
use std::path::Path;
use tiny_http::{Header, Request, Response, Server, StatusCode};

#[derive(serde::Serialize, serde::Deserialize)]
struct Comment {
    id: i64,
    message: String,
    author: String,
    created_at: String,
    approved: bool,
}

type RouteResponse = Response<Cursor<Vec<u8>>>;

fn row_to_comment(statement: &mut sqlite::Statement) -> Result<Comment, Box<dyn Error>> {
    let id = statement.read::<i64, _>("id")?;
    let message = statement.read::<String, _>("message")?;
    let author = statement.read::<String, _>("author")?;
    let approved = statement.read::<i64, _>("approved")? != 0;
    let created_at = statement.read::<String, _>("created_at")?;
    return Ok(Comment {
        id,
        message,
        author,
        approved,
        created_at,
    });
}

fn default_response(code: u16) -> RouteResponse {
    let code = StatusCode(code);
    let data = code.default_reason_phrase().as_bytes().to_vec();
    let len = data.len();
    return Response::new(
        code,
        vec!["Content-Type: text/plain".parse::<Header>().unwrap()],
        Cursor::new(data),
        Some(len),
        None,
    );
}

fn list_comments(conn: &sqlite::ConnectionThreadSafe) -> Result<RouteResponse, Box<dyn Error>> {
    let mut statement = conn.prepare("SELECT * FROM comments")?;
    let mut rows: Vec<Result<Comment, Box<dyn Error>>> = Vec::new();
    while let Ok(sqlite::State::Row) = statement.next() {
        rows.push(row_to_comment(&mut statement));
    }
    let comments: Result<Vec<Comment>, Box<dyn Error>> = rows.into_iter().collect();
    let comments = comments?;
    let data = serde_json::to_string(&comments)?.into_bytes();
    let len = data.len();
    return Ok(Response::new(
        StatusCode(200),
        vec!["Content-Type: application/json".parse::<Header>().unwrap()],
        Cursor::new(data),
        Some(len),
        None,
    ));
}

fn initialize_database(path: &Path) -> Result<sqlite::ConnectionThreadSafe, Box<dyn Error>> {
    let conn = sqlite::Connection::open_thread_safe(path)?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        author TEXT,
        apaproved BOOLEAN NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
    )?;
    return Ok(conn);
}

fn start_server(port: u16, db_conn: sqlite::ConnectionThreadSafe) -> Result<(), Box<dyn Error>> {
    let server = match Server::http(("0.0.0.0", port)) {
        Ok(server) => server,
        Err(e) => return Err(e),
    };
    for request in server.incoming_requests() {
        let route = (request.method(), request.url());
        println!("Handling {} {}", route.0, route.1);
        let response = match route {
            (&tiny_http::Method::Get, "/") => list_comments(&db_conn),
            _ => Ok(default_response(404)),
        };
        match response {
            Ok(response) => send_response(request, response),
            Err(e) => {
                eprintln!("Error: {}", e);
                send_response(request, default_response(500))
            }
        }
    }
    return Ok(());
}

fn send_response(request: Request, response: RouteResponse) {
    if let Err(e) = request.respond(response) {
        eprintln!("Error: {}", e);
    }
}

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = env::args().collect();
    let port = args
        .get(1)
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(8001);
    let db_path = Path::new("data.db");
    let conn = initialize_database(db_path)?;
    start_server(port, conn)?;
    return Ok(());
}
