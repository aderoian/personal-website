# Armen Deroian — Personal Website

Personal portfolio site built with **SvelteKit**, **Svelte 5**, **TypeScript**, **Tailwind CSS 4**, and **Zod**. Deployed with **adapter-node** on **Node.js 24**.

Live site: [armenderoian.dev](https://www.armenderoian.dev)

## Stack

- SvelteKit + Svelte 5 (runes)
- TypeScript
- Tailwind CSS 4
- Zod for JSON content validation
- Nodemailer for contact form delivery
- `@sveltejs/adapter-node` for production

## Requirements

- Node.js **24.x** (see `.nvmrc`)
- npm 10+

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Content

Project and blog content lives in repository-managed JSON:

- `data/projects.json` — project entries (including `published` draft state)
- `data/blog.json` — blog posts (empty array until posts are added)

Both files are validated at load time with Zod schemas in `src/lib/schemas/`.

Static assets (project images) go in `static/assets/`.

### Admin content management

The `/admin` area is password-protected and writes back to the same JSON files.

1. Copy `.env.example` to `.env` (or set environment variables in Docker).
2. Set **server-only** credentials:
   - `ADMIN_PASSWORD` — login password
   - `ADMIN_SESSION_SECRET` — long random secret used to sign session cookies (for example `openssl rand -hex 32`)
3. Restart the app. If either value is missing, admin login fails closed.

Draft projects and blog posts are editable in `/admin` but filtered from public routes until published. The live Markdown/HTML preview uses the same renderer as public pages and stays authenticated.

## Contact form

Copy `.env.example` to `.env` and configure SMTP settings:

```bash
CONTACT_FORM_TO_EMAIL=you@example.com
CONTACT_SMTP_HOST=smtp.example.com
CONTACT_SMTP_PORT=587
CONTACT_SMTP_USERNAME=...
CONTACT_SMTP_PASSWORD=...
CONTACT_SMTP_ENCRYPTION=tls
```

When `CONTACT_FORM_TO_EMAIL` is unset, the form renders in preview mode with submission disabled.

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start dev server             |
| `npm run build`   | Production build             |
| `npm run preview` | Preview production build     |
| `npm run check`   | Type-check with svelte-check |
| `npm run lint`    | ESLint + Prettier check      |
| `npm run test`    | Run Vitest tests             |

## Docker

```bash
docker compose up --build
```

Site available at [http://localhost:8080](http://localhost:8080).

The container runs the adapter-node build on port 3000, mapped to host port 8080. Content JSON is mounted **read-write** from `./data` so admin edits persist on the host. The image sets ownership of `/app/data` for the non-root `app` user; if you bind-mount a host directory created as root, ensure the container user can write (for example `chown -R 100:101 ./data` on Linux hosts — UID/GID match the Alpine `app` user created in the Dockerfile).

### Persistence and backups

- Treat `./data/projects.json` and `./data/blog.json` as the source of truth for published content when using Docker.
- Back up those files before major edits or deploys (copy the `data/` directory or include it in your backup tooling).
- Atomic writes use a temporary file plus rename so interrupted saves should not leave truncated JSON; still keep backups for operational mistakes and disk failures.

Set `ORIGIN` to the URL you use in the browser (default `http://localhost:8080`). If you open the site as `http://127.0.0.1:8080` instead, set `ORIGIN=http://127.0.0.1:8080` — a mismatch causes **Cross-site POST form submissions are forbidden** on form actions.

Also pass `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` via `.env` or your orchestrator when enabling `/admin`.

## Deployment

Production builds output to `build/` via adapter-node. Run with:

```bash
npm run build
node build/index.js
```

Set `PORT`, `HOST`, and `DATA_DIR` environment variables as needed. For writable content in production, mount a persistent volume at `DATA_DIR` and ensure the runtime user can write to it.
