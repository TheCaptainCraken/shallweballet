# Backend

Race simulation engine — Express + TypeScript, backed by PostgreSQL.

## Stack

- **Runtime:** Bun
- **Framework:** Express (chosen for OpenTelemetry Express instrumentation)
- **Database:** PostgreSQL via `bun:sql`
- **Observability:** OpenTelemetry (traces + structured logs via OTLP HTTP)

## Setup

```sh
bun install
cp .env.example .env   # fill in DATABASE_URL etc.
bun index.ts           # start server
bun --hot index.ts     # start with hot reload
```

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/race` | Simulate a race; returns `{ ticks, finishOrder }` |
| GET | `/api/stats` | Leaderboard — win rates, streaks, total races per animal |
| GET | `/api/history` | Recent race results |
| GET | `/api/status` | Health check |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `OTEL_SERVICE_NAME` | `pi-demo-backend` | Service name in traces |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTLP collector endpoint |

## Testing

```sh
bun test
bun test --test-name-pattern "pattern"
```
