FROM alpine:3.19 as builder

RUN echo "@testing http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
RUN apk update && apk add --no-cache typescript@testing
WORKDIR /usr/src/wall_of_thanks
COPY . .
RUN mkdir -p ./js
RUN tsc

FROM nginx:1.25-alpine
COPY --from=builder /usr/src/wall_of_thanks/ /usr/share/nginx/html

EXPOSE 80
