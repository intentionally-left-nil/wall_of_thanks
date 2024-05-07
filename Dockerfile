FROM alpine:3.19 as builder

RUN echo "@testing http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
RUN apk update && apk add --no-cache typescript@testing make rsync
WORKDIR /usr/src/wall_of_thanks
COPY . .
RUN make build

FROM nginx:1.25-alpine
COPY --from=builder /usr/src/wall_of_thanks/dist /usr/share/nginx/html

EXPOSE 80
