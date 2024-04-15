use regex::Regex;
use rusqlite;
use serde;
use serde_json;
use std::error::Error;
use std::io::Cursor;
use std::path::Path;
use std::{collections::HashMap, env};
use subtle::ConstantTimeEq;
use tiny_http::{Header, Request, Response, Server, StatusCode};

#[derive(serde::Serialize, serde::Deserialize)]
struct Comment {
    id: i64,
    message: String,
    author: String,
    created_at: String,
    approved: bool,
}

#[derive(serde::Deserialize)]
struct NewComment {
    message: String,
    author: String,
}

#[derive(serde::Deserialize, serde::Serialize)]
struct UpdateComment {
    approved: Option<bool>,
    message: Option<String>,
    author: Option<String>,
}

type RouteResponse = Response<Cursor<Vec<u8>>>;

// Keep in sync with row_to_comment
const ROW_QUERY: &str = "id, message, author, approved, created_at";
fn row_to_comment(row: &rusqlite::Row) -> Result<Comment, rusqlite::Error> {
    return Ok(Comment {
        id: row.get(0)?,
        message: row.get(1)?,
        author: row.get(2)?,
        approved: row.get(3)?,
        created_at: row.get(4)?,
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

fn respond_with_json<T>(code: u16, data: &T) -> Result<RouteResponse, Box<dyn Error>>
where
    T: ?Sized + serde::Serialize,
{
    let data = serde_json::to_string(&data)?.into_bytes();
    let len = data.len();
    return Ok(Response::new(
        StatusCode(code),
        vec!["Content-Type: application/json".parse::<Header>().unwrap()],
        Cursor::new(data),
        Some(len),
        None,
    ));
}

fn read_json<T>(request: &mut Request) -> Result<T, Box<dyn Error>>
where
    T: serde::de::DeserializeOwned,
{
    if !request
        .headers()
        .iter()
        .any(|h| h.field.equiv("Content-Type") && h.value == "application/json")
    {
        return Err("Content-type must be application/json".into());
    }
    let parsed: T = serde_json::from_reader(request.as_reader())?;
    return Ok(parsed);
}

fn list_comments(conn: &rusqlite::Connection) -> Result<RouteResponse, Box<dyn Error>> {
    let mut statement = conn.prepare(&format!("SELECT {} FROM comments", ROW_QUERY))?;
    let comments: Result<Vec<Comment>, _> = statement.query_map([], row_to_comment)?.collect();
    return respond_with_json(200, &comments?);
}

fn create_comment(
    request: &mut Request,
    conn: &rusqlite::Connection,
) -> Result<RouteResponse, Box<dyn Error>> {
    let comment: NewComment = match read_json(request) {
        Ok(comment) => comment,
        Err(e) => return respond_with_json(400, &e.to_string()),
    };
    let mut statement = conn.prepare(&format!(
        "INSERT INTO comments (message, author) VALUES (?1, ?2) RETURNING {}",
        ROW_QUERY
    ))?;
    let inserted = statement.query_row([&comment.message, &comment.author], row_to_comment)?;
    return respond_with_json(201, &inserted);
}

fn check_authorization(request: &Request, admin_password: &str) -> bool {
    let auth_header = request
        .headers()
        .iter()
        .find(|h| h.field.equiv("Authorization"));
    return match auth_header {
        Some(header) => {
            let prefix = "bearer ";
            if header.value.len() < prefix.len()
                || header.value.as_str()[..prefix.len()].to_lowercase() != prefix
            {
                false;
            }
            let incoming_password = &header.value.as_str()[prefix.len()..];
            bool::from(
                incoming_password
                    .as_bytes()
                    .ct_eq(admin_password.as_bytes()),
            )
        }
        None => false,
    };
}

fn approve_comment(
    request: &mut Request,
    id: i64,
    admin_password: &str,
    conn: &rusqlite::Connection,
) -> Result<RouteResponse, Box<dyn Error>> {
    if !check_authorization(request, admin_password) {
        return respond_with_json(401, "Unauthorized");
    }
    let updates: UpdateComment = match read_json(request) {
        Ok(comment) => comment,
        Err(e) => return respond_with_json(400, &e.to_string()),
    };
    let mut values: Vec<&dyn rusqlite::ToSql> = Vec::new();
    let mut query = String::new();
    query.push_str("UPDATE COMMENTS SET ");
    let approved = updates.approved.unwrap_or_default();
    let message = updates.message.clone().unwrap_or_default();
    let author = updates.author.clone().unwrap_or_default();

    if updates.approved.is_some() {
        values.push(&approved);
        if values.len() > 1 {
            query.push_str(", ");
        }
        query.push_str(&format!("approved = ?{}", values.len()));
    }
    if updates.message.is_some() {
        values.push(&message);
        if values.len() > 1 {
            query.push_str(", ");
        }
        query.push_str(&format!("message = ?{}", values.len()));
    }
    if updates.author.is_some() {
        values.push(&author);
        if values.len() > 1 {
            query.push_str(", ");
        }
        query.push_str(&format!("author = ?{}", values.len()));
    }
    if values.is_empty() {
        return respond_with_json(400, "No updates provided");
    }
    query.push_str(format!(" WHERE id = {} RETURNING {}", id, ROW_QUERY).as_str());
    let mut statement = conn.prepare(query.as_str())?;
    let updated = statement.query_row(values.as_slice(), row_to_comment)?;
    return respond_with_json(201, &updated);
}

fn initialize_database(path: &Path) -> Result<rusqlite::Connection, Box<dyn Error>> {
    let conn = rusqlite::Connection::open(path)?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        author TEXT,
        approved BOOLEAN NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        (),
    )?;
    return Ok(conn);
}

fn start_server(
    port: u16,
    db_conn: rusqlite::Connection,
    admin_password: &str,
) -> Result<(), Box<dyn Error>> {
    let server = match Server::http(("0.0.0.0", port)) {
        Ok(server) => server,
        Err(e) => return Err(e),
    };
    let patch_regex = Regex::new(r"^/(\d+)$")?;
    for mut request in server.incoming_requests() {
        let route = (request.method(), request.url());
        println!("Handling {} {}", route.0, route.1);
        let response = match route {
            (&tiny_http::Method::Get, "/") => list_comments(&db_conn),
            (&tiny_http::Method::Post, "/") => create_comment(&mut request, &db_conn),
            _ if route.0 == &tiny_http::Method::Put && patch_regex.is_match(route.1) => {
                let id = patch_regex.captures(route.1).unwrap()[1].parse::<i64>()?;
                approve_comment(&mut request, id, admin_password, &db_conn)
            }
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
    let admin_password = "test"; // TODO read from the command line
    start_server(port, conn, admin_password)?;
    return Ok(());
}
