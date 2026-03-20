import { type RouteConfig, index, layout, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("sign-in/*", "routes/sign-in.tsx"),
  layout("routes/_protected.tsx", [
    route("character-select", "routes/character-select.tsx"),
    route("race", "routes/race.tsx"),
    route("stats", "routes/stats.tsx"),
    route("races", "routes/race-history.tsx"),
    route("races/:id", "routes/race-replay.tsx"),
  ]),
] satisfies RouteConfig
