# NoteVault

NoteVault is a collaborative workspace app: real-time note editing, an approval workflow with version history, projects, tasks, milestones, a knowledge graph and a workspace changelog.

## Tech stack

- **Frontend:** Next.js 15, React, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, Socket.IO, Yjs (conflict-free collaborative editing)
- **Database:** MySQL 8 with Prisma ORM

## Roles

| Role | Can do |
| --- | --- |
| **Admin** | Everything: rename/delete the workspace, invite people with any role, manage all projects |
| **Team Lead** | Create projects, tasks and milestones, invite people to projects, approve/reject notes |
| **Employee** | Work in projects they were added to: edit notes, submit notes for review, update their own tasks |

Whoever creates a workspace is its Admin. Everyone else joins via an invitation link.

---

## Local development

**Prerequisites:** Node.js 20+ and a MySQL 8 server.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

- `DATABASE_URL`: your MySQL connection string.
- `JWT_SECRET`: at least 32 random characters. To generate one, run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- Email settings (optional locally): without them, emails (invites, password resets) are printed in the backend terminal so you can copy the links. See [Email](#email) for the options.

Create the tables and start the API on http://localhost:5069:

```bash
npm run migrate
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 and create an account.

### Already have a database from an older version?

Older versions created tables with `prisma db push`. Mark the original schema as applied once, then run the new migrations:

```bash
cd backend
npx prisma migrate resolve --applied 0_init
npm run migrate
```

### Or run everything with Docker

```bash
cp .env.example .env    # set MYSQL_ROOT_PASSWORD and JWT_SECRET
docker compose up --build
```

---

## Tests and checks

```bash
cd backend
npm test        # starts a throwaway MySQL automatically (downloads it on first run)
npm run lint

cd ../frontend
npm run lint
npm run build
```

The backend suite covers authentication, cross-workspace isolation, roles, invitations, password resets, the approval workflow, notifications, reminders and real-time collaborative editing. GitHub Actions runs all checks on every push and pull request (`.github/workflows/ci.yml`).

---

## Deploying

NoteVault is two services and a database:

| Part | Suggested host | Notes |
| --- | --- | --- |
| MySQL 8 | Railway, PlanetScale-compatible MySQL, AWS RDS, DigitalOcean | Any MySQL 8 works |
| API (`backend/`) | Railway, Render or Fly.io (`backend/Dockerfile`) | Long-running Node process with WebSockets. Not serverless |
| Web (`frontend/`) | Vercel, or `frontend/Dockerfile` anywhere | Set `NEXT_PUBLIC_API_URL` **before building** |

### API environment variables

| Variable | Required | Example |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` |
| `DATABASE_URL` | yes | `mysql://user:pass@host:3306/notevault` |
| `JWT_SECRET` | yes | 64 random hex characters |
| `FRONTEND_URL` | yes | `https://notevault.example.com` (used in email links and as the allowed CORS origin) |
| `CORS_ORIGINS` | no | Extra comma-separated origins |
| `TRUST_PROXY` | behind a proxy | `1` on Railway, Render, Fly and similar hosts |
| `SMTP_*` | yes, for email | See [Email](#email) |
| `PORT` | no | Defaults to `5069` |

The API refuses to start in production if a required variable is missing or `JWT_SECRET` is too short. The Docker image runs `prisma migrate deploy` on start. On other hosts, run `npm run migrate` as a release step.

### Email

Invitations and password resets are sent by email. **Without email settings, password reset does not work in production** (invites still work, since the Admin can copy the invite link).

**Option A: Gmail.** Easiest; about 500 emails a day. Create a Gmail account for the app, turn on 2-step verification, create an [App Password](https://myaccount.google.com/apppasswords), then set:

```
SMTP_EMAIL=notevault.team@gmail.com
SMTP_APP_PASSWORD=abcd efgh ijkl mnop
```

**Option B: an email service** (Resend, Brevo, SendGrid, Mailgun, Postmark). Better inbox delivery, and emails can come from your own domain. Copy the SMTP settings from the provider:

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<api key>
SMTP_FROM=NoteVault <noreply@yourdomain.com>
```

### Frontend environment variables

| Variable | Example |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.notevault.example.com` |

### Scaling notes

- **Live editing:** the note state lives in the API process. Run **one API instance**, or add sticky sessions plus the Socket.IO Redis adapter before scaling out.
- **Reminder job:** the hourly due-date job runs in every API instance. If you run more than one, set `ENABLE_CRON=false` on all but one.

### Launch checklist

- [ ] Use a new `JWT_SECRET` and a new Gmail App Password, never ones that have been committed to git
- [ ] Serve both the API and the web app over HTTPS
- [ ] Set up automated database backups
- [ ] Health check: `GET /api/health` returns `{"status":"ok","database":"ok"}`

---

## Project structure

```
backend/
  app.js              Express app (routes, security middleware, error handler)
  server.js           HTTP + Socket.IO server, reminder job, graceful shutdown
  config.js           Environment variable validation
  controllers/        Route handlers
  middleware/         Auth (JWT) and request validation
  realtime/collab.js  Collaborative editing (Yjs over Socket.IO)
  jobs/reminders.js   Hourly due-date reminders
  utils/access.js     All permission checks
  validation/         Request schemas (zod)
  prisma/             Schema and migrations
  test/               Integration tests
frontend/
  src/app/            Pages
  src/components/     Sidebar, notifications, auth guard, toasts
  src/lib/            API client, session, collaborative editor hook
docs/user-stories.md  Product requirements
```
