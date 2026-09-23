# Kinesis Cars

A car booking & fleet management platform. Rented vehicles from verified
merchants, or manage your fleet — powered by the Kinesis API
(`https://api.kinesis.world/x/cars/`).

## Tech stack

- [Astro](https://astro.build) (static output)
- [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite`
- [React](https://react.dev) islands (`@astrojs/react`) for client-side state

## Getting started

```sh
bun install
cp .env.example .env   # set PUBLIC_API_URL to your Kinesis API base
bun run dev            # http://localhost:4321
```

When running the dev server in the background, use:

```sh
bunx astro dev --background
bunx astro dev status
bunx astro dev logs
bunx astro dev stop
```

## Environment variables

| Variable         | Default                                  | Purpose                                        |
| :--------------- | :--------------------------------------- | :--------------------------------------------- |
| `PUBLIC_API_URL` | `https://api.kinesis.world/x/cars/`      | Base URL of the Kinesis Cars REST API          |

`PUBLIC_API_URL` is prefixed with `PUBLIC_` so it is inlined into client-side
code at build time. The `AppProvider` context (`src/context/AppContext.tsx`)
reads it and exposes `apiUrl`, `api(path)` and `request(path, init)` helpers.

## Commands

| Command           | Action                                        |
| :---------------- | :-------------------------------------------- |
| `bun install`     | Install dependencies                          |
| `bun run dev`     | Start local dev server at `localhost:4321`    |
| `bun run build`   | Build your production site to `./dist/`       |
| `bunx astro check`| Type-check the project                        |
| `bun run preview` | Preview your build locally                    |

## Deploy

The site is hosted at `cars.kinesis.world` behind Traefik. CI builds the
Docker image, pushes it to the Gitea registry and recreates the compose
service. See `.gitea/workflows/main.yml` for the pipeline, plus the required
Gitea variables/secrets listed at the top of that file.

## Project structure

```text
/
├── .gitea/workflows/main.yml   # Build + deploy pipeline
├── Dockerfile                  # Multi-stage build (bun → nginx)
├── docker-compose.yml          # Traefik service definition
├── nginx.conf.template         # envsubst-processed nginx config
├── src
│   ├── components
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── react/ApiBadge.tsx  # Demo React island using AppContext
│   ├── context
│   │   └── AppContext.tsx      # ContextWrapper → loads PUBLIC_API_URL
│   ├── layouts/Layout.astro
│   └── pages
│       ├── index.astro         # Landing page
│       ├── browse.astro        # Browse vehicles (placeholder)
│       ├── login.astro
│       ├── register.astro
│       └── 404.astro
└── package.json
```