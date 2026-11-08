# Natheelco TaskFlow

Natheelco TaskFlow stores shared dashboard records in the TaskFlow backend database. Local development uses the SQLite backend; Vercel uses the configured Postgres database.

## Run locally

```bash
npm install
npm --prefix Backend start
```

In another terminal:

```bash
npm run dev
```

Open the local URL printed by Vite. The default development server proxies API requests to `http://localhost:8889`; create an admin PIN on first launch. To intentionally use isolated browser-only storage for a demo, run `npm run dev:frontend-only`.

## Build and preview

```bash
npm run build
npm run preview
```

The production frontend build and `/cash-bank/` dashboard are bundled together. In production, the frontend saves records through the same-origin backend API; on Vercel, configure the database and private file storage as described in the repository README. `npm run build:frontend-only` creates a standalone demo that stores its data in this browser only.

## Local data and integrations

TaskFlow saves dashboard records and audit history in the shared backend database. Uploaded files use the backend's protected file storage. On first admin sign-in after switching from a browser-only demo, saved IndexedDB records and files are copied to the backend without overwriting existing server records.

For local development, configure `CLICKUP_API_TOKEN` in `Backend/.env` and restart the backend. On Vercel, configure it as a server environment variable and redeploy. Never expose the token in a `VITE_` variable or commit it. Gmail and Google Meet/Zoom account integrations require server-side OAuth configuration.
