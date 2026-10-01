# WebWatch

WebWatch is a small uptime-monitoring platform. Users create an account, add a public website or API, and track downtime and recovery after WebWatch verifies a failure with retries. Email delivery activates when Resend is configured.

**Live beta:** https://webwatch-gamma.vercel.app

## Current MVP

- Email/password accounts with an HTTP-only session cookie
- PostgreSQL storage through Prisma
- $1/month per monitored website
- Automatic 5, 10, or 15-minute checks
- Three attempts before declaring downtime
- Downtime incidents and recovery detection
- Durable Resend alert delivery with database-backed retries, crash-safe leases, and local preview mode
- Pause, resume, delete, and check-now actions
- 7-day check history, incident history, response chart, and 30-day uptime percentage
- API rate limiting and security headers
- SSRF protection for local, private, and reserved destinations, including redirect validation and DNS address pinning
- Responsive React dashboard

WebWatch uses Dodo Payments for $1-per-monitor monthly subscriptions. Billing is enabled only after the live Dodo product, API key, and webhook signing key have been configured.

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
        +---- Notification outbox ---- Resend (downtime/recovery alerts)
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

## Cloudflare scheduler for the early beta

For a small free beta, `cloudflare-scheduler/` provides a free five-minute Cron Trigger that securely calls the protected `/api/cron` endpoint. It is a serverless scheduler rather than a continuously running worker. Keep the database lease enabled, and disable the GitHub Actions schedule only after the Cloudflare trigger has been verified in production.

## Zero-monthly-cost Cloudflare deployment

`cloudflare-app/` is the deployment target for the budget launch. It replaces Vercel, Render, Neon, and the separate scheduler with one Cloudflare Worker:

- React static assets are served by Cloudflare Workers Assets.
- The Worker serves `/api/*` and runs the five-minute scheduled monitor checks itself.
- Cloudflare D1 stores accounts, monitors, checks, and incidents.
- Resend remains optional for email alerts.

The Worker free tier is appropriate only for a deliberately small beta. WebWatch does not impose a monitor cap, so check D1 writes and Worker CPU usage as adoption grows and move to a paid Cloudflare plan before free-tier limits become a constraint.

### Deploy it

1. Create a Cloudflare account and buy your domain. Add the domain as a Cloudflare zone (Cloudflare will show the nameservers to enter at the domain registrar).
2. In a terminal, run `cd cloudflare-app && npm run build`.
3. Create the database once: `npx wrangler d1 create webwatch`. Copy the returned `database_id` into `cloudflare-app/wrangler.jsonc`.
4. Set `CLIENT_ORIGIN` in `wrangler.jsonc` to `https://your-domain.com`, then run `npx wrangler d1 migrations apply webwatch --remote`.
5. Create the required session secret: `npx wrangler secret put JWT_SECRET`. Use a long random value. Optionally add `RESEND_API_KEY` and `ALERT_FROM` the same way after verifying your sending domain.
6. Deploy with `npm run deploy` from `cloudflare-app/`. In Cloudflare Dashboard → Workers & Pages → `webwatch` → Settings → Domains & Routes, attach `your-domain.com`.

For the paid launch, create a **live-mode $1/month monitor-slot product** in Dodo, then set `DODO_PAYMENTS_MODE=live_mode` and add the Dodo API key and webhook signing key as Cloudflare secrets. Verify checkout, the `payment.succeeded` webhook, and monitor-slot fulfilment on the custom domain before accepting customers. The existing Vercel/Express application remains in the repository as the fuller paid-scale path.

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

During the beta, alerts are sent only to the monitor owner's WebWatch account email. Supporting additional recipients requires a separate email-verification flow.

Downtime and recovery messages are saved to the PostgreSQL notification outbox in the same transaction as the incident change. WebWatch attempts delivery immediately and retries temporary failures with exponential backoff. A delivery lease prevents multiple workers from sending the same notification concurrently, and a Resend idempotency key protects against duplicates if a process crashes after Resend accepts a message.

For real email delivery:

1. Create a Resend account and verify a sending domain that you own.
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
| `SCHEDULER_CONCURRENCY` | Maximum monitor checks running in one scheduler invocation | `10` |
| `CHECK_RETENTION_DAYS` | Detailed check history retention | `30` |
| `NOTIFICATION_RETENTION_DAYS` | Alert delivery record retention | `90` |
| `INCIDENT_RETENTION_DAYS` | Resolved incident retention | `365` |
| `RESEND_API_KEY` | Enables real email delivery | Empty/preview mode |
| `ALERT_FROM` | Resend sender identity | Resend onboarding sender |
| `ACCOUNT_EMAILS_ENABLED` | Enables verification and password-reset email sending | `false` |
| `REQUIRE_EMAIL_VERIFICATION` | Blocks login until the account email is verified | `false` |
| `CRON_SECRET` | Protects the production scheduler endpoint | Required for `/api/cron` |
| `BILLING_ENABLED` | Enables paid monitor slots | `false` |
| `DODO_PAYMENTS_API_KEY` | Creates Dodo checkout sessions | Required when billing is enabled |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Verifies Dodo payment webhooks | Required when billing is enabled |
| `DODO_PAYMENTS_PRODUCT_ID` | Dodo product used for a monitor slot | Required when billing is enabled |
| `DODO_PAYMENTS_MODE` | Selects Dodo test or live API | `test_mode` |

## API overview

### Public

- `GET /health` — API health
- `GET /api/health/ready` — database and scheduler-heartbeat readiness
- `POST /api/check` — one manual public-URL check
- `POST /api/auth/register` — create an account
- `POST /api/auth/login` — start a session
- `POST /api/auth/logout` — clear the session
- `POST /api/auth/verify-email` — consume a one-time verification token
- `POST /api/auth/resend-verification` — request another verification email
- `POST /api/auth/forgot-password` — request a password-reset email without revealing account existence
- `POST /api/auth/reset-password` — consume a one-time reset token and invalidate older sessions
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
- **Notification** — durable alert payload, delivery attempts, retry time, and provider message ID
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

The repository includes Vercel configuration for the React frontend and Express API. Production uses Neon PostgreSQL. The early beta uses the free Cloudflare Cron Trigger in `cloudflare-scheduler/` to call `GET /api/cron` every five minutes with `Authorization: Bearer <CRON_SECRET>`.

The GitHub Actions workflow remains available through `workflow_dispatch` as an emergency manual trigger. It has no automatic schedule, which prevents duplicate scheduler calls.

Monitor checks and notification delivery both use PostgreSQL leases. This allows multiple scheduler calls or workers to overlap without intentionally processing the same work twice. Redis and BullMQ remain a future scaling option when the database queue becomes a measurable bottleneck.

The scheduler uses bounded concurrency so a large due batch cannot open an unbounded number of network and database operations. Once per day, the same protected scheduler invocation claims a database maintenance lease and removes old data in batches:

- detailed checks after 30 days
- notification delivery records after 90 days
- resolved incidents after 365 days
- used or expired account tokens after 7 days

Retention values are configurable. Active incidents, users, monitors, and payment records are not removed by this maintenance job.

Every successful scheduler cycle writes a database heartbeat and a structured JSON log. The readiness endpoint returns `503` when PostgreSQL is unavailable or when no scheduler cycle has completed for 15 minutes. Point an independent uptime monitor at `/api/health/ready` so WebWatch failures are visible even when the dashboard is unattended.

For public deployment:

- Use managed PostgreSQL with backups.
- Run frontend and API behind HTTPS.
- Set `NODE_ENV=production` so cookies require HTTPS.
- Set the exact production `CLIENT_ORIGIN`.
- Add network-level egress rules alongside application SSRF checks.
- Configure a verified Resend domain.
- After the domain is verified, set `ACCOUNT_EMAILS_ENABLED=true`; then set `REQUIRE_EMAIL_VERIFICATION=true`.
- Add `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `COOKIE_NAME`, `CRON_SECRET`, and optional Resend variables to Vercel.
- Run `npx prisma migrate deploy --schema Backend/prisma/schema.prisma` against the production database.
- Add centralized logs and an external monitor for WebWatch itself.
