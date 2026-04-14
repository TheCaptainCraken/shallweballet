# k6 Load Tests

Load test scripts for the race simulation backend.

## Requirements

- [k6](https://k6.io/docs/getting-started/installation/) installed on your machine
- Bun (for TypeScript type resolution only — k6 runs the script directly)

## File layout

```
k6/
  race.ts           # stress test — hammers /api/race directly
  user-journey.ts   # realistic user simulation with Clerk auth
  lib/
    config.ts       # env vars + ANIMAL_IDS constant
    utils.ts        # shuffle, rand
    auth.ts         # per-VU Clerk JWT management
    api.ts          # typed wrappers for each backend endpoint
```

## Running

```sh
k6 run race.ts                           # default: 5 VUs for 30s → localhost:3000
BACKEND_URL=http://host k6 run race.ts   # override target
```

## What it does

### `race.ts` — stress test
Hammers the race endpoint:
- Each virtual user picks 3–10 random animals, shuffles them, and POSTs to `/api/race`
- Sleeps 100ms between races
- Reports standard k6 HTTP metrics (latency, throughput, error rate)

### `user-journey.ts` — realistic usage test
Simulates 20 concurrent users over 12 minutes (1m ramp-up, 10m hold, 1m ramp-down). Each virtual user loops through:
1. Run a race → sleep 5–15s (watching the replay)
2. Check the stats leaderboard → sleep 2–5s
3. Browse race history → sleep 1–3s
4. Fetch a specific race detail (30% of the time) → sleep 1–2s

Requires Clerk auth. Each VU signs in independently using a short-lived ticket from the Clerk Backend API, then caches and refreshes its JWT automatically.

```sh
CLERK_SECRET_KEY=sk_test_... CLERK_USER_ID=user_... k6 run user-journey.ts
CLERK_SECRET_KEY=sk_test_... CLERK_USER_ID=user_... BACKEND_URL=http://host k6 run user-journey.ts
CLERK_SECRET_KEY=sk_test_... CLERK_USER_ID=user_... CLERK_FRONTEND_API_URL=https://your-app.clerk.accounts.dev k6 run user-journey.ts
```

**Env vars:**
| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `CLERK_SECRET_KEY` | yes | — | Clerk secret key (`sk_test_...`) |
| `CLERK_USER_ID` | yes | — | Clerk user ID to sign in as |
| `BACKEND_URL` | no | `http://localhost:3000` | Backend base URL |
| `CLERK_FRONTEND_API_URL` | no | parsed from sign-in token response | Clerk Frontend API origin (e.g. `https://your-app.clerk.accounts.dev`) |

If `CLERK_SECRET_KEY` or `CLERK_USER_ID` are missing/wrong, setup fails immediately with a clear error before any VUs start.
