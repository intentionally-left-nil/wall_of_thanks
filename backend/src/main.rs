use base64::{self, Engine};
use clap::{self, Parser};
use rand::Rng;
use regex::Regex;
use rusqlite;
use serde;
use serde::{Deserialize, Serialize};
use serde_json;
use std::error::Error;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use subtle::ConstantTimeEq;
use tiny_http::{Header, Request, Response, Server, StatusCode};

#[derive(serde::Serialize, serde::Deserialize)]
struct Comment {
    id: i64,
    message: String,
    author: String,
    created_at: String,
    approved: bool,
    #[serde(
        deserialize_with = "parse_secret",
        serialize_with = "encode_secret",
        skip_serializing_if = "is_secret_empty"
    )]
    secret: [u8; 16],
}

fn decode_secret(b64_secret: String) -> Result<[u8; 16], Box<dyn Error>> {
    let mut secret = [0u8; 16];
    let num_bytes =
        base64::engine::general_purpose::STANDARD_NO_PAD.decode_slice(b64_secret, &mut secret)?;
    if num_bytes == 16 {
        return Ok(secret);
    } else {
        return Err("Invalid secret length".into());
    }
}

fn parse_secret<'de, D>(deserializer: D) -> Result<[u8; 16], D::Error>
where
    D: serde::Deserializer<'de>,
{
    let b64_secret = String::deserialize(deserializer)?;
    return decode_secret(b64_secret).map_err(serde::de::Error::custom);
}

fn encode_secret<S>(secret: &[u8; 16], serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let b64_secret = base64::engine::general_purpose::STANDARD_NO_PAD.encode(secret);
    return b64_secret.to_string().serialize(serializer);
}

fn is_secret_empty(secret: &[u8; 16]) -> bool {
    return secret.iter().all(|&b| b == 0);
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
const ROW_QUERY: &str = "id, secret, message, author, approved, created_at";
fn row_to_comment(row: &rusqlite::Row) -> Result<Comment, rusqlite::Error> {
    return Ok(Comment {
        id: row.get(0)?,
        secret: row.get(1)?,
        message: row.get(2)?,
        author: row.get(3)?,
        approved: row.get(4)?,
        created_at: row.get(5)?,
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

fn list_comments(
    request: &mut Request,
    conn: &rusqlite::Connection,
    admin_password: &str,
) -> Result<RouteResponse, Box<dyn Error>> {
    let mut statement = match is_admin(request, admin_password) {
        true => conn.prepare(&format!("SELECT {} FROM comments", ROW_QUERY))?,
        false => conn.prepare(&format!(
            "SELECT {} FROM comments WHERE approved = 1",
            ROW_QUERY
        ))?,
    };
    let mut comments = statement
        .query_map([], row_to_comment)?
        .collect::<Result<Vec<Comment>, _>>()?;

    comments.iter_mut().for_each(|comment| {
        comment.secret = [0u8; 16];
    });

    return respond_with_json(200, &comments);
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
        "INSERT INTO comments (message, author, secret) VALUES (?1, ?2, ?3) RETURNING {}",
        ROW_QUERY
    ))?;
    let secret: [u8; 16] = rand::thread_rng().gen();
    let params: [&dyn rusqlite::ToSql; 3] = [&comment.message, &comment.author, &secret];
    let inserted = statement.query_row(params, row_to_comment)?;
    return respond_with_json(201, &inserted);
}

fn get_auth_token(request: &Request) -> Option<&str> {
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
                return None;
            }
            let incoming_password = &header.value.as_str()[prefix.len()..];
            return Some(incoming_password);
        }
        None => None,
    };
}

fn is_admin(request: &Request, admin_password: &str) -> bool {
    return match get_auth_token(request) {
        Some(token) => bool::from(token.as_bytes().ct_eq(admin_password.as_bytes())),
        None => false,
    };
}

fn is_author(request: &Request, comment_id: i64, conn: &rusqlite::Connection) -> bool {
    let result: Result<bool, Box<dyn Error>> = (|| match get_auth_token(request) {
        Some(token) => {
            let secret = decode_secret(token.to_string())?;
            let mut statement = conn.prepare("SELECT secret FROM comments WHERE id = ?1")?;
            let params: [&dyn rusqlite::ToSql; 1] = [&comment_id];
            let stored_secret: [u8; 16] = statement.query_row(params, |row| row.get(0))?;
            return Ok(bool::from(secret.ct_eq(&stored_secret)));
        }
        None => Ok(false),
    })();

    match result {
        Ok(val) => val,
        Err(_) => false,
    }
}

fn update_comment(
    request: &mut Request,
    id: i64,
    admin_password: &str,
    conn: &rusqlite::Connection,
) -> Result<RouteResponse, Box<dyn Error>> {
    let admin = is_admin(request, admin_password);
    let authorized = admin || is_author(request, id, conn);
    if !authorized {
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

    if updates.approved.is_some() && admin {
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
        secret BLOB NOT NULL,
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
    frontend_origin: String,
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
            (&tiny_http::Method::Get, "/") => list_comments(&mut request, &db_conn, admin_password),
            (&tiny_http::Method::Post, "/") => create_comment(&mut request, &db_conn),
            _ if route.0 == &tiny_http::Method::Put && patch_regex.is_match(route.1) => {
                let id = patch_regex.captures(route.1).unwrap()[1].parse::<i64>()?;
                update_comment(&mut request, id, admin_password, &db_conn)
            }
            _ if route.0 == &tiny_http::Method::Options => {
                let mut response = default_response(200);
                response.add_header(
                    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE"
                        .parse::<Header>()
                        .unwrap(),
                );
                response.add_header(
                    "Access-Control-Allow-Headers: Authorization, Accept, Content-Type"
                        .parse::<Header>()
                        .unwrap(),
                );
                Ok(response)
            }
            _ => Ok(default_response(404)),
        };
        match response {
            Ok(mut response) => {
                response.add_header(
                    format!("Access-Control-Allow-Origin: {}", frontend_origin)
                        .parse::<Header>()
                        .unwrap(),
                );
                response.add_header("Access-Control-Max-Age: 300".parse::<Header>().unwrap());
                send_response(request, response);
            }
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

#[derive(clap::Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    #[arg(short, long, required = true)]
    secret: String,

    #[arg(short, long, default_value_t = 8001)]
    port: u16,

    #[arg(short, long, default_value = "data.db")]
    db_path: PathBuf,

    #[arg(long, default_value = "*")]
    frontend_origin: String,
}

fn main() -> Result<(), Box<dyn Error>> {
    let args = Args::parse();
    let conn = initialize_database(args.db_path.as_path())?;
    start_server(args.port, conn, args.frontend_origin, &args.secret)?;
    return Ok(());
}
