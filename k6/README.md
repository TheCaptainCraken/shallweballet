# k6 Load Tests

Load test scripts for the race simulation backend.

## Requirements

- [k6](https://k6.io/docs/getting-started/installation/) installed on your machine
- Bun (for TypeScript type resolution only — k6 runs the script directly)

## Running

```sh
k6 run race.ts                           # default: 5 VUs for 30s → localhost:3000
BACKEND_URL=http://host k6 run race.ts   # override target
```

## What it does

`race.ts` simulates concurrent users hitting the race endpoint:

- Each virtual user picks 3–10 random animals, shuffles them, and POSTs to `/api/race`
- Sleeps 100ms between races
- Reports standard k6 HTTP metrics (latency, throughput, error rate)
