# One More Race I Promise

A browser-based random racing simulation built for demo and load testing. Up to 10 animals race across an isometric 3D track. Race logic is computed entirely on the backend; the frontend is pure presentation.

## Services

| Service | Stack | Default port |
|---------|-------|-------------|
| `backend/` | Express + TypeScript + PostgreSQL | 3000 |
| `frontend/` | React 19 + React Router v7 + Three.js | 5173 (dev) / 8080 (Docker) |
| `k6/` | k6 load test | — |

## Quick start

### Docker (recommended)

```sh
docker compose up --build
```

Frontend → http://localhost:8080, Backend → http://localhost:3000

### Local dev

```sh
# Terminal 1 — backend
cd backend && bun install && bun --hot index.ts

# Terminal 2 — frontend
cd frontend && bun install && bun run dev
```

Requires a running PostgreSQL instance. Set `DATABASE_URL` in `backend/.env` (see `backend/.env.example`).

## How it works

1. The frontend POSTs selected racer IDs to `/api/race`
2. The backend runs `simulateRace()` — up to 100 ticks of random speeds over a track length of 1500 — and returns all tick data plus finish order
3. The frontend counts down ("3, 2, 1, GO!") then replays one tick per second; Three.js updates 3D model positions each frame
4. The finished race is saved to PostgreSQL asynchronously

## Observability

The backend exports OpenTelemetry traces and logs via OTLP HTTP. Set `OTEL_EXPORTER_OTLP_ENDPOINT` to point at your collector (default: `http://localhost:4318`).
