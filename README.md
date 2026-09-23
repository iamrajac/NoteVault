<div align="center">

# NoteVault

**A collaborative workspace for teams: write notes together in real time, get them approved, and turn them into tasks and milestones.**

[![CI](https://github.com/iamrajac/NoteVault/actions/workflows/ci.yml/badge.svg)](https://github.com/iamrajac/NoteVault/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-notevault--dev.vercel.app-2563eb)](https://notevault-dev.vercel.app)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Prisma-4479A1?logo=mysql&logoColor=white)

[**Try the live demo →**](https://notevault-dev.vercel.app)

<img src="docs/screenshots/dashboard.png" alt="NoteVault dashboard showing projects, pending tasks and team activity" width="900">

</div>

---

## Features

**Real-time collaborative notes**
- Several people can edit the same note at once. Edits merge automatically ([Yjs](https://yjs.dev) CRDTs), so nobody overwrites anyone
- Live presence ("2 online"), autosave, and full version history with one-click restore
- Link related notes together and turn any note into tasks

**Approval workflow**
- Authors submit notes for review; Team Leads and Admins approve or reject with a reason
- Every rejected version is kept, and the right people are notified at each step

**Projects, tasks and milestones**
- Tasks with priority, difficulty, due dates and assignees, plus automatic load-balanced assignment
- Milestones that group tasks and notes, and a calendar of every deadline
- Hourly reminders for tasks due within 24 hours

**Teams and workspaces**
- Multiple workspaces per person, with a workspace switcher
- Roles: **Admin**, **Team Lead**, **Employee**, enforced on the server for every request
- Invite by email or shareable link; manage roles and members
- In-app notifications, workspace-wide search (Ctrl+K), and an activity changelog with comments

**Built to be deployed**
- JWT authentication, per-request permission checks, rate limiting, security headers, locked-down CORS
- Password reset by one-time email link; invitation tokens stored only as hashes
- Database migrations that run on deploy, Docker images, and CI on every push

## Screenshots

| Collaborative editor | Tasks |
| --- | --- |
| <img src="docs/screenshots/editor.png" alt="Note editor with live collaboration, tags and linked notes"> | <img src="docs/screenshots/tasks.png" alt="Task list with priorities, assignees, due dates and statuses"> |

| Milestones |
| --- |
| <img src="docs/screenshots/milestones.png" alt="Milestones with linked tasks and notes" width="600"> |

## How it works

```mermaid
flowchart LR
    Browser["Browser<br/>Next.js app"] -- "REST (JWT)" --> API["API<br/>Node.js + Express"]
    Browser <-- "Socket.IO + Yjs<br/>live editing" --> API
    API -- Prisma --> DB[("MySQL")]
    API -- "invites & password resets" --> Mail["Email<br/>Brevo / SMTP"]
```

- **Frontend** (`frontend/`): Next.js 15, React, Tailwind CSS. Deployed on Vercel.
- **Backend** (`backend/`): Express REST API, plus a Socket.IO server that holds one shared Yjs document per open note and autosaves it to the database.
- **Database:** MySQL 8 via Prisma, with versioned migrations.

## Roles

| Role | Can do |
| --- | --- |
| **Admin** | Everything: rename or delete the workspace, invite people with any role, change roles, remove members |
| **Team Lead** | Create projects, tasks and milestones; invite people to projects; approve or reject notes |
| **Employee** | Work in projects they were added to: edit notes, submit them for review, update their own tasks |

Whoever creates a workspace is its Admin. Everyone else joins through an invitation.

---

## Getting started

**Prerequisites:** Node.js 20+ and a MySQL 8 server.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

- `DATABASE_URL`: your MySQL connection string.
- `JWT_SECRET`: at least 32 random characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- Email is optional locally. Without it, invite and password-reset emails are printed in the backend terminal so you can copy the links.

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

### Or run everything with Docker

```bash
cp .env.example .env    # set MYSQL_ROOT_PASSWORD and JWT_SECRET
docker compose up --build
```

### Tests

```bash
cd backend && npm test && npm run lint     # starts a throwaway MySQL automatically
cd frontend && npm run lint && npm run build
```

The backend suite covers authentication, cross-workspace isolation, roles, invitations, password resets, the approval workflow, notifications, reminders, email delivery and real-time collaborative editing. GitHub Actions runs every check on each push.

---

## Deployment

The live demo runs on **Vercel** (frontend), **Render** (API) and **Aiven** (MySQL). Any similar hosts work.

| Part | Host | Notes |
| --- | --- | --- |
| Web (`frontend/`) | Vercel, or `frontend/Dockerfile` | Set `NEXT_PUBLIC_API_URL` **before building** |
| API (`backend/`) | Render, Railway, Fly.io, or `backend/Dockerfile` | Long-running Node process (WebSockets). Not serverless |
| Database | Any MySQL 8 | Aiven, Railway, AWS RDS, DigitalOcean... |

**API settings on Render:** Root Directory `backend`, Build Command `npm install`, Start Command `npm run start:prod`. The start command applies database migrations, then starts the server. Databases created by the old `prisma db push` setup are detected and migrated without losing data.

### API environment variables

| Variable | Required | Example |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` |
| `DATABASE_URL` | yes | `mysql://user:pass@host:3306/notevault` (add `?sslaccept=accept_invalid_certs` for Aiven) |
| `JWT_SECRET` | yes | 64+ random hex characters |
| `FRONTEND_URL` | yes | `https://notevault-dev.vercel.app` (used in email links and as the only allowed CORS origin) |
| `TRUST_PROXY` | behind a proxy | `1` on Render, Railway, Fly and similar hosts |
| `BREVO_API_KEY` + `SMTP_FROM` | for email | See [Email](#email) |
| `CORS_ORIGINS` | no | Extra comma-separated origins |
| `PORT` | no | Defaults to `5069` |

The API refuses to start in production if a required variable is missing or `JWT_SECRET` is too short.

### Frontend environment variables

| Variable | Example |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://notevault-6p9e.onrender.com` |

### Email

Invitations and password resets are sent by email. Without email settings, password reset does not work in production. Invites still do, because the Admin can copy the link.

**Brevo (recommended, and required on Render's free plan, which blocks SMTP ports).** Free for 300 emails a day. Verify your sender address in Brevo, create an API key (SMTP & API → API Keys), then set:

```
BREVO_API_KEY=<api key>
SMTP_FROM=NoteVault <you@gmail.com>
```

**Gmail** (on hosts that allow SMTP): turn on 2-step verification, create an [App Password](https://myaccount.google.com/apppasswords), then set `SMTP_EMAIL` and `SMTP_APP_PASSWORD`.

**Any SMTP provider** (Resend, SendGrid, Mailgun, Postmark): set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `SMTP_FROM`.

### Scaling notes

- **Live editing** keeps each open note in the API process. Run one API instance, or add sticky sessions and the Socket.IO Redis adapter before scaling out.
- **The reminder job** runs in every API instance. With more than one, set `ENABLE_CRON=false` on all but one.

---

## Project structure

```
backend/
  app.js              Express app: routes, security middleware, error handler
  server.js           HTTP + Socket.IO server, reminder job, graceful shutdown
  config.js           Environment variable validation
  controllers/        Route handlers
  middleware/         Auth (JWT) and request validation
  realtime/collab.js  Collaborative editing (Yjs over Socket.IO)
  jobs/reminders.js   Hourly due-date reminders
  utils/access.js     All permission checks
  validation/         Request schemas (zod)
  scripts/migrate.js  Deploy-time migrations
  prisma/             Schema and migrations
  test/               Integration tests
frontend/
  src/app/            Pages
  src/components/     Sidebar, notifications, auth guard, toasts
  src/lib/            API client, session, collaborative editor hook
docs/
  user-stories.md     Product requirements
  screenshots/        Images used in this README
```
