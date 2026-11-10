# Natheelco TaskFlow

## Run locally

```bash
npm install
npm --prefix ../Backend start
```

Copy `.env.example` to `.env` before building or deploying. For local development the frontend API client uses the Vite proxy to the local backend.

In another terminal:

```bash
npm run dev
```

Open the local URL printed by Vite. The development server proxies API requests to `http://localhost:8889`; create an admin PIN on first launch. Both TaskFlow and Cash & Bank require backend authentication and persist records through the API.

## Production configuration

Set `VITE_API_URL` to the deployed backend origin (the supplied default is `https://backend-omega-one-50.vercel.app`) in the frontend deployment environment. Production builds fail when this setting is missing. Local development uses the Vite proxy to the local backend. Configure the backend's `FRONTEND_ORIGINS` with the exact deployed frontend origin so browser authentication and API requests are accepted.

## Build and preview

```bash
npm run build
npm run preview
```

The production frontend build and `/cash-bank/` dashboard are bundled together. Both apps save records and files through the authenticated backend API. Configure the backend database and private file storage as described in `../Backend/README.md`.

## Local data and integrations

TaskFlow and Cash & Bank save records and audit history in the shared backend database. Uploaded files use protected backend file storage. On first sign-in, existing browser records are copied to the backend without overwriting existing server records, then removed from browser storage.

The Natheel Gulf Email Client stores contacts through the backend and sends text-only messages using the connected Gmail account. The signed-in user needs the Mails permission and a configured Gmail connection; attachments are not supported in this composer.

For local development, configure `CLICKUP_API_TOKEN` in `Backend/.env` and restart the backend. On Vercel, configure it as a server environment variable and redeploy. Never expose the token in a `VITE_` variable or commit it. Gmail and Google Meet/Zoom account integrations require server-side OAuth configuration.
