# LendAHand — Web

A full-stack rebuild of the original JavaFX **LendAHand** desktop app: a community task marketplace where **Task Posters** hire **Helpers** for small gigs, with an in-app wallet, escrow, bidding, reviews, a live map, and an AI assistant.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite, Tailwind CSS (light/dark mode via `dark:` classes), React Router, react-leaflet |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite via Prisma ORM |
| Auth | JWT in an httpOnly cookie, bcrypt password hashing |
| Maps | Leaflet + OpenStreetMap tiles (free, no API key) |
| Geocoding | OpenStreetMap Nominatim (free, no API key), called server-side |
| AI | Google Gemini (`gemini-2.5-flash`) for price estimates and the chat assistant — requires your own API key |
| Deployment | Docker + Railway (`Dockerfile` / `railway.toml`, single container serves both API and static frontend) |

## Local development

```bash
npm install                        # installs both workspaces
cp backend/.env.example backend/.env   # fill in JWT_SECRET / GEMINI_API_KEY
npm run prisma:migrate             # creates dev.db and seeds categories
npm run dev                        # runs backend (:5050) + frontend (:5173) together
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the backend, so cookies work without CORS configuration.

To get AI price estimates and the chat assistant working, put a real key from https://aistudio.google.com/app/apikey into `backend/.env` as `GEMINI_API_KEY`. Without a key, those features degrade gracefully to a friendly fallback message — every other feature works normally.

## Production build

```bash
npm run build   # vite build (frontend/dist) + tsc (backend/dist)
npm start       # Express serves the API and the built frontend from one process
```

## Deploying (Railway)

This repo includes a `Dockerfile` and `railway.toml` that mirror a single-service deploy: one container runs `prisma migrate deploy` then starts Express, which serves both the API and the built React app.

**Important:** SQLite is a file on disk, and Railway's default filesystem is ephemeral — anything written after a deploy is lost on the next one. Before deploying for real, attach a [Railway Volume](https://docs.railway.com/reference/volumes) and set `DATABASE_URL` to a path inside it, e.g. `file:/data/lendahand.db`, so the database survives redeploys.

## What changed vs. the original JavaFX app

The original app is untouched at `../LendAHand`. This rewrite replicates every feature (auth, posting, bidding, escrow, reviews, wallet, map, AI estimate/chat, dark mode) and fixes several real bugs found while reading the original source:

- **Plaintext passwords** → bcrypt hashing.
- **Hardcoded Gemini API key in source** → read from a gitignored `.env`, server-side only.
- **`wallet_transactions` table referenced but never created** → a first-class `WalletTransaction` model, written atomically with every balance change.
- **Dead `notifications` table** (created, never used) → fully wired: bid received, bid accepted/rejected, task completed.
- **Non-atomic bid acceptance** (task status, bid status, and wallet deduction were separate un-transacted steps) → every money-moving action (`acceptBid`, `markDone`, `cancel`, `deposit`, `withdraw`) is now a single Prisma `$transaction`.
- **Fragile runtime dark-mode hack** (regex-replacing inline hex colors) → a proper Tailwind `dark:` class-based theme.

## Project structure

```
LendAHand-Web/
├── backend/    Express API, Prisma schema, business logic
└── frontend/   React app (pages, components, contexts)
```

See `backend/src/routes` for the full REST API surface and `backend/src/services` for the transactional escrow/wallet/bid logic.
