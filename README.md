# wall_of_thanks

Welcome! This repo contains a static HTML frontend and a small rust + sqlite backend to make a website where people can write thoughtful messages. The usecase I had was to celebrate a graduation, and I wanted family to be able to leave thoughtful notes for their loved one.

# Frontend

To use the frontend, the easiest way is with the published docker container. Just mount a volume into the images folder containing the images you want:

```yaml
frontend:
  image: ghcr.io/intentionally-left-nil/wall_of_thanks-frontend:main
  ports:
    - '80:80'
  volumes:
    - ./images/:/usr/share/nginx/html/images
```

## Running outside of docker

First, add the website image to `images/hero_full.png` and a favicon to `images/favicon.png`
Then, make sure you have typescript (`tsc`) installed on your computer.
Lastly, just run `make build` to generate the dist folder
That's it! Just host the folder somewhere.

# Backend

There's also a docker container for the backend:

```yaml
backend_published:
  profiles:
    - prod
  image: ghcr.io/intentionally-left-nil/wall_of_thanks-backend:main
  ports:
    - '80:8000'
  volumes:
    - db:/data/db
  env_file:
    - .env
  init: true
```

Make sure to create an `.env` file with the following contents:

```sh
admin_secret='my_secret'
frontend_origin='my_frontend_domain' # CORS domain for the frontend. Defaults to '*' if not set
auto_approve='true' # Whether to require an admin to approve the comment before it is visible
```

The frontend code expects the backend to be available at `https://api.frontend-domain.com`
Otherwise you can just modify the [source code](./ts/backend.ts) to point to the correct spot

## Running outside of docker

Make sure you have rust installed, then run `make backend`

# Admin superpowers

By default, only the author can edit their post (and only until they refresh the page).
Also, comments won't show up until an admin approves them (small safety feature in case of abuse)
To gain admin privileges, open up your dev tools, then create a `localStorage` item with key: `token` and value: `my_secret` where the secret matches the .env file for the backend

# Design choices

Very simply: I wanted to learn rust on the backend, and to try out web components on the frontend. Thus, the code choices are more learning-style. I chose backend dependencies that made me write more code & understand things better. I didn't worry about tests or factoring things out cleanly. On the frontend side, some of the web components I made were to prove out the concept. I wanted to use slots, and attributes, and events.

TL;DR: This isn't a production-quality repo :D But I did learn a whole lot of things, like how to [slide in](./ts/column_item.ts) into a flexbox
