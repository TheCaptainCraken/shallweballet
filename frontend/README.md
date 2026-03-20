# Frontend

React 19 SPA — character selection, 3D race visualization, leaderboard, and race history.

## Stack

- **Framework:** React 19 + React Router v7 (SPA, SSR disabled)
- **3D rendering:** Three.js via `@react-three/fiber` + `@react-three/drei`
- **Styling:** Tailwind v4 (OKLCH color space) + shadcn/ui (radix-vega style, hugeicons)
- **Build:** Vite

## Setup

```sh
bun install
bun run dev        # Vite dev server with HMR → http://localhost:5173
```

Set `VITE_BACKEND_URL` if the backend is not at `http://localhost:3000`.

## Commands

```sh
bun run dev        # development server
bun run build      # production build → build/client/
bun run start      # serve production build
bun run typecheck  # generate React Router types + tsc
bun run format     # Prettier (run before committing)
bun test           # run tests
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Home / character grid |
| `/select` | Character selection |
| `/race` | Live race (Three.js 3D track) |
| `/replay/:id` | Replay a past race |
| `/history` | Race history list |
| `/stats` | Leaderboard |

Selected characters are passed between routes via React Router `location.state`.

## Adding shadcn components

```sh
bunx shadcn@latest add <component>
```

Components are placed in `app/components/ui/` and imported as `@/components/ui/<component>`.
