FROM rust:1.78-alpine3.19 as builder
RUN apk update && apk add --no-cache musl-dev sqlite-static sqlite-dev

WORKDIR /usr/src/wall_of_thanks

COPY . .

RUN cargo build --release


FROM alpine:latest
ENV frontend_origin="*"
WORKDIR /usr/local/bin

COPY --from=builder /usr/src/wall_of_thanks/target/release/wall_of_thanks /usr/local/bin/wall_of_thanks
RUN chmod +x /usr/local/bin/wall_of_thanks

# Run the binary when the container launches
CMD /usr/local/bin/wall_of_thanks --secret "$admin_secret" --port 8000 --db-path /data/db.sqlite3 --frontend-origin "$frontend_origin"
