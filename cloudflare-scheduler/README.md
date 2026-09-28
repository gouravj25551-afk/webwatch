# WebWatch Cloudflare Scheduler

This small Cloudflare Worker calls WebWatch's protected `/api/cron` endpoint every five minutes. It is intended for the early beta while the number of monitors is small.

## How it works

1. Cloudflare invokes the Worker's `scheduled` handler every five minutes.
2. The Worker sends `Authorization: Bearer <CRON_SECRET>` to the WebWatch API.
3. WebWatch queries PostgreSQL for due monitors and runs them.
4. Cloudflare records the scheduled invocation result in its logs.

## Configure

Install dependencies:

```bash
npm install
```

Authenticate Wrangler:

```bash
npx wrangler login
```

Store the same `CRON_SECRET` value that is configured in Vercel:

```bash
npx wrangler secret put CRON_SECRET
```

Do not commit the secret to Git.

## Verify locally

```bash
npm test
npm run dev
```

In another terminal, trigger the local scheduled handler:

```bash
curl "http://localhost:8787/cdn-cgi/handler/scheduled"
```

## Deploy

```bash
npm run deploy
```

After deployment, confirm a successful scheduled event in Cloudflare's logs before disabling the GitHub Actions schedule.
