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

- `data/projects.json` — project entries
- `data/blog.json` — blog posts (empty array until posts are added)

Both files are validated at load time with Zod schemas in `src/lib/schemas/`.

Static assets (project images) go in `static/assets/`.

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

The container runs the adapter-node build on port 3000, mapped to host port 8080. Content JSON is mounted read-only from `./data`.

## Deployment

Production builds output to `build/` via adapter-node. Run with:

```bash
npm run build
node build/index.js
```

Set `PORT`, `HOST`, and `DATA_DIR` environment variables as needed.
