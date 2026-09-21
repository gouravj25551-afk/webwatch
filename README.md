# WebWatch

WebWatch is a small uptime-monitoring platform. Users create an account, add a public website or API, and track downtime and recovery after WebWatch verifies a failure with retries. Email delivery activates when Resend is configured.

**Live beta:** https://webwatch-gamma.vercel.app

## Current MVP

- Email/password accounts with an HTTP-only session cookie
- PostgreSQL storage through Prisma
- Up to 10 monitors per free beta account
- Automatic 5, 10, or 15-minute checks
- Three attempts before declaring downtime
- Downtime incidents and recovery detection
- Resend email integration with local preview mode; production delivery requires a verified sender
- Pause, resume, delete, and check-now actions
- 7-day check history, incident history, response chart, and 30-day uptime percentage
- API rate limiting and security headers
- SSRF protection for local, private, and reserved destinations, including redirect validation and DNS address pinning
- Responsive React dashboard

The codebase includes a disabled Dodo Payments integration for a future $1-per-monitor plan. Free beta mode stays active until billing credentials are configured and `BILLING_ENABLED=true` is set.

## Architecture

```text
React + Vite (5173)
        |
        | /api and /health (development proxy)
        v
Express API (3001) ---- Prisma ---- PostgreSQL
        |
        +---- Monitor scheduler (database-backed due checks)
        +---- HTTP checker (timeout, redirects, SSRF guard, retries)
        +---- Resend (downtime/recovery alerts)
```

PostgreSQL is the source of truth. When the backend restarts, its scheduler scans the database and runs monitors whose next check is due.

## Dedicated worker

Run the API and worker as separate processes in production:

```bash
npm start --workspace=webwatch-backend
npm run worker --workspace=webwatch-backend
```

The worker scans PostgreSQL every 30 seconds and checks only monitors whose configured interval has elapsed. A database lease prevents two worker or scheduler processes from checking the same monitor simultaneously. If a worker crashes, its lease expires after two minutes and another process can safely retry the monitor.

The worker needs `DATABASE_URL`, `JWT_SECRET`, `CHECK_INTERVAL_MS`, `RESEND_API_KEY`, and `ALERT_FROM`. It does not accept public HTTP traffic.

## Learning hub

`learning-hub/` contains WebWatch Academy, a separate React app that teaches this codebase milestone by milestone. It does not affect the product. Run it with `cd learning-hub && npm install && npm run dev`. See [learning-hub/README.md](learning-hub/README.md).

## Quick start

### Requirements

- Node.js 22 or newer
- PostgreSQL 16 or compatible

### 1. Create the database

```bash
createdb webwatch
```

### 2. Configure and start the backend

```bash
cd Backend
cp .env.example .env
npm install
npx prisma migrate dev
npm start
```

Update `DATABASE_URL` and generate a long random `JWT_SECRET` in `Backend/.env` before starting.

The backend runs at `http://localhost:3001`.

### 3. Start the frontend

In another terminal:

```bash
cd Frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Email alerts

Without a `RESEND_API_KEY`, alerts run in preview mode and are printed in the backend terminal. This lets the full incident flow work locally without sending email.

For real email delivery:

1. Create a Resend account and verify a sending domain.
2. Set `RESEND_API_KEY` in `Backend/.env`.
3. Set `ALERT_FROM` to an address on the verified domain.
4. Restart the backend.

Never place the Resend key in the frontend.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection | Required |
| `JWT_SECRET` | Signs session tokens | Required |
| `PORT` | Express API port | `3001` |
| `CLIENT_ORIGIN` | Allowed browser origin | `http://localhost:5173` |
| `COOKIE_NAME` | Session-cookie name | `webwatch_token` |
| `CHECK_INTERVAL_MS` | How often the scheduler scans for due work | `30000` |
| `MAX_MONITORS_PER_USER` | Beta account limit | `10` |
| `RESEND_API_KEY` | Enables real email delivery | Empty/preview mode |
| `ALERT_FROM` | Resend sender identity | Resend onboarding sender |
| `CRON_SECRET` | Protects the production scheduler endpoint | Required for `/api/cron` |
| `BILLING_ENABLED` | Enables paid monitor slots | `false` |
| `DODO_PAYMENTS_API_KEY` | Creates Dodo checkout sessions | Required when billing is enabled |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Verifies Dodo payment webhooks | Required when billing is enabled |
| `DODO_PAYMENTS_PRODUCT_ID` | Dodo product used for a monitor slot | Required when billing is enabled |
| `DODO_PAYMENTS_MODE` | Selects Dodo test or live API | `test_mode` |

## API overview

### Public

- `GET /health` — API health
- `POST /api/check` — one manual public-URL check
- `POST /api/auth/register` — create an account
- `POST /api/auth/login` — start a session
- `POST /api/auth/logout` — clear the session
- `GET /api/auth/me` — return the signed-in user
- `POST /api/webhooks/dodo` — receive verified Dodo payment events

### Authenticated monitors

- `GET /api/monitors` — monitors with uptime summaries
- `POST /api/monitors` — create and immediately check a monitor
- `PATCH /api/monitors/:id` — update, pause, or resume a monitor
- `DELETE /api/monitors/:id` — delete a monitor and its history
- `POST /api/monitors/:id/check` — check now
- `GET /api/monitors/:id/history?days=7` — checks and incidents

## Database models

- **User** — account email and password hash
- **Monitor** — URL, alert destination, interval, and current state
- **Check** — status code, response time, error, and retry count
- **Incident** — downtime start and recovery time
- **Payment** — future Dodo checkout and monitor-slot purchase

Deleting a user or monitor cascades to its related history.

## Verification

Backend tests:

```bash
cd Backend
npm test
npm audit --omit=dev
```

Frontend checks:

```bash
cd Frontend
npm run lint
npm run build
```

## Deployment notes

The repository includes Vercel configuration for the React frontend and Express API. Production uses Neon PostgreSQL. Until the dedicated worker is deployed and verified, the GitHub Actions scheduler calls `GET /api/cron` every five minutes with `Authorization: Bearer <CRON_SECRET>`.

After the dedicated worker has been healthy for at least one day, disable the GitHub scheduler to avoid unnecessary fallback runs. Keep the protected `/api/cron` endpoint for emergency manual runs.

This MVP scheduler is designed for one worker. Before running multiple workers, add a distributed queue or database claim/lease so two workers cannot execute the same monitor simultaneously.

For public deployment:

- Use managed PostgreSQL with backups.
- Run frontend and API behind HTTPS.
- Set `NODE_ENV=production` so cookies require HTTPS.
- Set the exact production `CLIENT_ORIGIN`.
- Add network-level egress rules alongside application SSRF checks.
- Configure a verified Resend domain.
- Add `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `COOKIE_NAME`, `CRON_SECRET`, and optional Resend variables to Vercel.
- Run `npx prisma migrate deploy --schema Backend/prisma/schema.prisma` against the production database.
- Add centralized logs and an external monitor for WebWatch itself.
