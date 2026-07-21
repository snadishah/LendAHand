# LendAHand — Web

**LendAHand** is a full-stack community task marketplace where **Task Posters** hire **Helpers** for small gigs — with an in-app wallet, escrow, bidding, two-way reviews, a live map, and an AI assistant.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite, Tailwind CSS (light/dark mode via `dark:` classes), React Router, react-leaflet |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma ORM (e.g. a free [Neon](https://neon.tech) project) |
| Auth | JWT in an httpOnly cookie, bcrypt password hashing |
| Maps | Leaflet + OpenStreetMap tiles (free, no API key) |
| Geocoding | OpenStreetMap Nominatim (free, no API key), called server-side |
| AI | Google Gemini (`gemini-2.5-flash`) for price estimates and the chat assistant — requires your own API key |
| Deployment | Docker, deployable to any container host (Render free tier, Fly.io, Railway) — single container serves both API and static frontend |

## Local development

```bash
npm install                        # installs both workspaces
cp backend/.env.example backend/.env   # fill in DATABASE_URL / JWT_SECRET / GEMINI_API_KEY
npm run prisma:migrate             # applies migrations and seeds categories
npm run dev                        # runs backend (:5050) + frontend (:5173) together
```

`DATABASE_URL` needs a real Postgres connection string — a free [Neon](https://neon.tech) or [Supabase](https://supabase.com) project both work well with Prisma and need no credit card.

Open http://localhost:5173. The Vite dev server proxies `/api` to the backend, so cookies work without CORS configuration.

To get AI price estimates and the chat assistant working, put a real key from https://aistudio.google.com/app/apikey into `backend/.env` as `GEMINI_API_KEY`. Without a key, those features degrade gracefully to a friendly fallback message — every other feature works normally.

## Production build

```bash
npm run build   # vite build (frontend/dist) + tsc (backend/dist)
npm start       # Express serves the API and the built frontend from one process
```

## Deploying for free (Render + Neon)

This repo's `Dockerfile` runs `prisma migrate deploy` then starts Express, which serves both the API and the built React app from one container — deployable to any Docker-based host without modification.

1. **Database**: create a free Postgres project at [Neon](https://neon.tech) or [Supabase](https://supabase.com) (no credit card) and copy its connection string.
2. **Host**: on [Render](https://render.com), create a new **Web Service**, connect this GitHub repo, and choose the **Docker** runtime (it auto-detects the `Dockerfile`). Render's free tier needs no card and needs no persistent volume, since state lives in Postgres.
3. **Environment variables** on the Render service:
   - `DATABASE_URL` — the Neon/Supabase connection string
   - `JWT_SECRET` — a long random string
   - `GEMINI_API_KEY` — from https://aistudio.google.com/app/apikey (optional; AI features degrade gracefully without it)
   - `NODE_ENV=production`
4. Deploy. Render builds the image, runs the migration against your Postgres database, and serves the app on a free `*.onrender.com` URL.

Note: Render's free web services spin down after ~15 minutes of inactivity and take a bit to wake back up on the next request — normal for a free tier, not a bug.

`railway.toml` is still included if you'd rather deploy to Railway instead (its own free trial credit eventually runs out, unlike Render/Neon's free tiers).

## Features

- **Auth** — JWT in an httpOnly cookie, bcrypt-hashed passwords.
- **Post & bid** — post a task with a budget; helpers bid, and posters accept the best offer.
- **Escrow wallet** — accepting a bid holds the funds in escrow, released to the helper on confirmation, with a dispute path and an auto-release safety net. Every balance change is a single atomic Prisma `$transaction`.
- **Two-way reviews & ratings** — posters and helpers rate each other.
- **Live map** — server-side geocoding places tasks on a Leaflet / OpenStreetMap map, sortable by distance.
- **Admin console** — moderate tasks, settle disputes, and ban users.
- **AI assistant** — Gemini-powered price estimates and a chat helper.
- **Light / dark mode** — a class-based Tailwind theme.

## Project structure

```
LendAHand-Web/
├── backend/    Express API, Prisma schema, business logic
└── frontend/   React app (pages, components, contexts)
```

See `backend/src/routes` for the full REST API surface and `backend/src/services` for the transactional escrow/wallet/bid logic.
