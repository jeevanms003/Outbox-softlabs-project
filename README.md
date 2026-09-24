# ReachInbox Email Job Scheduler

Full-stack email scheduling service built with Express, BullMQ, Redis, PostgreSQL, and Next.js.

---

## Feature Checklist

### Backend
- [x] TypeScript — type safety across API, queue, and DB layers
- [x] Express.js — REST API for scheduling, listing, and stats
- [x] BullMQ + Redis — delayed job scheduling (zero cron, anywhere)
- [x] PostgreSQL + Prisma — durable source of truth with typed ORM
- [x] Ethereal Email — real SMTP send flow with preview URLs
- [x] Worker concurrency — configurable via `WORKER_CONCURRENCY` env
- [x] Minimum delay between sends — `MIN_DELAY_MS` + BullMQ limiter
- [x] Hourly rate limit — Redis-backed `INCR` counter, never in-memory
- [x] Rate limit hit -> reschedule to next hour, never drop
- [x] Idempotency — `email.id` as BullMQ `jobId` + DB status check before send
- [x] Restart-safe — rehydration on startup using DB as truth, BullMQ deduplicates
- [x] 1000+ emails — batch DB writes + async queue inserts, API responds immediately

### Frontend
- [x] Google OAuth — real OAuth 2.0, not mocked
- [x] Dashboard with Scheduled / Sent tabs
- [x] Compose modal — subject, body, CSV upload, recipients count, start time, delay, hourly limit
- [x] Scheduled emails table — recipient, subject, sender, scheduled time, status
- [x] Sent emails table — recipient, subject, sender, sent time, status, Ethereal preview link
- [x] Loading skeletons + empty states throughout
- [x] Stats cards — scheduled / sending / sent / failed counts
- [x] Auto-refresh every 30 seconds
- [x] Reusable components — Header, ComposeModal, EmailTable, StatsCards
- [x] Typed API client (`lib/api.ts`) and TypeScript props everywhere

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js Frontend                    │
│  Login -> Google OAuth -> Dashboard (Scheduled/Sent)    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP (credentials: include)
                        ▼
┌─────────────────────────────────────────────────────────┐
│               Express.js API (Port 4000)                │
│  POST /api/emails/schedule                              │
│  GET  /api/emails/scheduled                             │
│  GET  /api/emails/sent                                  │
│  GET  /api/emails/stats                                 │
│  GET  /api/auth/google  ──> Google OAuth                │
│  GET  /api/auth/callback <-- Google OAuth               │
│  GET  /api/auth/me                                      │
│  POST /api/auth/logout                                  │
└───────┬───────────────────────────────────────┬─────────┘
        │ write rows                            │ read/update
        ▼                                       ▼
┌───────────────────┐              ┌─────────────────────────┐
│   PostgreSQL DB   │              │      BullMQ Queue       │
│   (Prisma ORM)    │<-rehydrate──-│  (Redis-backed, delay)  │
│                   │              └───────────┬─────────────┘
│  Email.status:    │                          │ delayed jobs
│   SCHEDULED       │                          ▼
│   SENDING         │              ┌─────────────────────────┐
│   SENT            │              │     BullMQ Worker       │
│   FAILED          │              │  1. Idempotency check   │
│                   │<─────────────│  2. Rate limit (Redis)  │
│  User (OAuth)     │              │  3. Status -> SENDING   │
└───────────────────┘              │  4. Ethereal SMTP send  │
                                   │  5. Status -> SENT/FAIL │
                                   └─────────────────────────┘
```

### Scheduling (No Cron)
Every email is scheduled via `emailQueue.add("send-email", { emailId }, { delay, jobId: emailId })`.
- `delay` is `sendAt - now` in milliseconds.
- `jobId = emailId` serves as BullMQ's native deduplication key.

### Restart Persistence
On every server startup, `rehydrateQueue()` queries all `SCHEDULED`/`SENDING` emails from the DB and re-enqueues them. Because `jobId = emailId`, BullMQ silently ignores any already-queued job. This guarantees no lost sends after restart and no duplicate sends.

### Idempotency Guard (Worker)
Before every send, the worker checks `email.status === 'SENT'` and returns early if true. This handles edge cases like a worker crash mid-send + job retry, or manual re-enqueue bugs.

### Rate Limiting
```
Key:   rate:{sender}:{YYYY-MM-DD-HH}
Op:    INCR (atomic) + EXPIRE 3600s (on count === 1)
Safe:  Works across multiple workers — never in-memory
Limit: MAX_EMAILS_PER_HOUR (env, default 50)
Hit:   job.moveToDelayed(nextHour + 500ms) — never dropped
```

### 1000+ Emails
The schedule API batches DB writes in chunks of 100 (Prisma transactions) and enqueues jobs asynchronously. The HTTP response returns immediately after enqueuing — the worker spreads sends over time via the rate limiter and `delayBetweenMs` stagger.

---

## Setup & Running

### Prerequisites
- Docker Desktop
- Node.js 18+
- A Google Cloud project with OAuth 2.0 credentials

### 1. Clone & Install

```bash
# Backend
cd backend
npm install
npx prisma generate

# Frontend
cd ../frontend
npm install
```

### 2. Start Infrastructure (Docker)

```bash
# From project root
docker compose up -d
```

This starts PostgreSQL on port 5432 and Redis on port 6379.

### 3. Configure Backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (default works with Docker) |
| `REDIS_URL` | Redis URL (default works with Docker) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | Must be `http://localhost:4000/api/auth/callback` |
| `SESSION_SECRET` | Any long random string |
| `FRONTEND_URL` | `http://localhost:3000` |
| `MAX_EMAILS_PER_HOUR` | Hourly send cap per sender (default: 50) |
| `WORKER_CONCURRENCY` | Parallel workers (default: 5) |
| `MIN_DELAY_MS` | Min gap between sends in ms (default: 1000) |
| `ETHEREAL_USER` / `ETHEREAL_PASS` | Leave blank -> auto-generated at startup |

### 4. Run DB Migration

```bash
cd backend
npx prisma migrate dev --name init
```

### 5. Start Backend

```bash
cd backend
npm run dev
```

On startup you will see output indicating that Redis has connected, Ethereal test credentials were created (save these to your .env to reuse them), the BullMQ worker has started, and the API is running at localhost:4000.

### 6. Configure Frontend

The `frontend/.env.local` file already contains:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 7. Start Frontend

```bash
cd frontend
npm run dev
```

Visit **http://localhost:3000** in your browser.

---

## Google OAuth Setup

1. Go to Google Cloud Console.
2. Create or select a project.
3. Navigate to APIs & Services -> Credentials.
4. Click Create Credentials -> OAuth 2.0 Client IDs.
5. Application type: Web application.
6. Authorized redirect URIs: `http://localhost:4000/api/auth/callback`.
7. Copy the Client ID and Client Secret into `backend/.env`.

---

## API Reference

### POST /api/emails/schedule
Schedule a batch of emails.

```json
{
  "recipients": ["alice@example.com", "bob@example.com"],
  "subject": "Hello!",
  "body": "This is your email body.",
  "sender": "noreply@yourdomain.com",
  "sendAt": "2025-01-15T10:00:00.000Z",
  "delayBetweenMs": 1000,
  "hourlyLimit": 50
}
```

Response:
```json
{
  "success": true,
  "data": {
    "batchId": "uuid-here",
    "scheduled": 2,
    "message": "2 email(s) scheduled successfully"
  }
}
```

### GET /api/emails/scheduled?page=1&limit=20
List emails with status `SCHEDULED` or `SENDING`.

### GET /api/emails/sent?page=1&limit=20
List emails with status `SENT` or `FAILED`.

### GET /api/emails/stats
Returns counts: `{ scheduled, sending, sent, failed, total }`.

### DELETE /api/emails/:id
Cancel a SCHEDULED email (removes from queue + DB).

### GET /api/auth/google
Redirect to Google OAuth.

### GET /api/auth/callback
OAuth callback — sets session, redirects to frontend dashboard.

### GET /api/auth/me
Returns `{ id, email, name, avatar }` for the logged-in user.

### POST /api/auth/logout
Destroys session.

---

## Demo: Restart Scenario

To prove restart-safe behavior:

```bash
# 1. Start the server
cd backend && npm run dev

# 2. Schedule an email 5 minutes in the future via the dashboard or:
curl -X POST http://localhost:4000/api/emails/schedule \
  -H "Content-Type: application/json" \
  -d '{"recipients":["test@test.com"],"subject":"Test","body":"Hello","sender":"me@example.com","sendAt":"<5 minutes from now as ISO>"}'

# 3. Stop the server (Ctrl+C)

# 4. Restart the server
npm run dev
# You will see: "Rehydrating 1 pending email(s)..."

# 5. Wait for the scheduled time — the email fires without duplicates
```

---

## Project Structure

```text
reachinbox-scheduler/
├── docker-compose.yml          # Postgres 16 + Redis 7
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Email + User models
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth.routes.ts  # Google OAuth + session routes
│   │   │   └── email.routes.ts # Schedule / list / stats / cancel
│   │   ├── db/
│   │   │   └── client.ts       # Prisma singleton
│   │   ├── mailer/
│   │   │   └── ethereal.ts     # Ethereal SMTP transporter
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts
│   │   ├── queue/
│   │   │   ├── queue.ts        # BullMQ Queue instance
│   │   │   ├── redis.ts        # ioredis connection
│   │   │   ├── worker.ts       # Send processor (idempotent + rate-limited)
│   │   │   └── rehydrate.ts    # Startup re-queue from DB
│   │   ├── rateLimiter/
│   │   │   └── hourlyLimiter.ts # Redis INCR-based per-sender limiter
│   │   └── index.ts            # Express app bootstrap
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + SEO metadata
│   │   ├── globals.css         # Dark theme + animations
│   │   ├── page.tsx            # Login page (Google OAuth)
│   │   └── dashboard/
│   │       └── page.tsx        # Main dashboard (protected)
│   ├── components/
│   │   ├── ComposeModal.tsx    # Email compose form + CSV upload
│   │   ├── EmailTable.tsx      # Scheduled + Sent tables (shared)
│   │   ├── Header.tsx          # Logo + user info + logout
│   │   └── StatsCards.tsx      # Stats overview cards
│   ├── lib/
│   │   └── api.ts              # Typed fetch wrapper for all endpoints
│   ├── types/
│   │   └── email.ts            # Shared TypeScript types
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
└── README.md
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis URL |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:4000/api/auth/callback` | OAuth redirect URI |
| `SESSION_SECRET` | — | Express session secret |
| `FRONTEND_URL` | `http://localhost:3000` | CORS + OAuth redirect target |
| `ETHEREAL_USER` | auto | Ethereal SMTP user |
| `ETHEREAL_PASS` | auto | Ethereal SMTP password |
| `MAX_EMAILS_PER_HOUR` | `50` | Global hourly rate limit |
| `WORKER_CONCURRENCY` | `5` | BullMQ worker concurrency |
| `MIN_DELAY_MS` | `1000` | Minimum gap between sends (ms) |
| `PORT` | `4000` | HTTP server port |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Backend API base URL |

---

## Trade-offs & Assumptions

1. Single queue, multiple senders — Rate limiting is per-sender (scoped by sender email + hour). A single burst from one sender won't block others.
2. Prisma over raw SQL — Faster development, full type safety, and easy migration history. Trade-off: slight cold-start overhead.
3. SENDING status — The worker sets `status = SENDING` before calling SMTP. If the process crashes mid-send, the row stays as SENDING. On restart, rehydration resets these to SCHEDULED and re-enqueues. The idempotency guard (`status === 'SENT'`) prevents double delivery even if the SMTP call succeeded before the crash.
4. No distributed lock for SENDING transition — For a single-node deployment, the optimistic check is sufficient. For true multi-node production, a `SELECT FOR UPDATE` or Redis-based advisory lock would be needed.
5. Session stored in Redis — Sessions survive backend restarts cleanly, and scale across multiple instances.
6. Batch stagger by `delayBetweenMs` — Recipients in a batch get their `sendAt` staggered: `sendAt + (index * delayBetweenMs)`. This is a UX-visible delay, not just a worker-level throttle.
7. Ethereal Email — A real SMTP flow (no mock), but emails only go to the Ethereal inbox. Preview URLs are stored in the DB and shown in the Sent table.
