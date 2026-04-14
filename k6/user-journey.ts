import http from "k6/http";
import { check, sleep, fail } from "k6";
import type { Options } from "k6/options";

import {
  CLERK_SECRET_KEY,
  CLERK_USER_ID,
  CLERK_FRONTEND_API_URL,
  ANIMAL_IDS,
} from "./lib/config.ts";
import { shuffle, rand } from "./lib/utils.ts";
import { clerkAuth } from "./lib/auth.ts";
import { runRace, getStats, getRaces, getRaceDetail } from "./lib/api.ts";
import type { RaceResponse, StatsResponse, RacesResponse } from "./lib/api.ts";

// ---------------------------------------------------------------------------
// Load test scenario
// ---------------------------------------------------------------------------

export const options: Options = {
  scenarios: {
    normal_usage: {
      executor: "ramping-vus",
      stages: [
        { duration: "1m", target: 50 }, // ramp up
        { duration: "10m", target: 50 }, // hold
        { duration: "1m", target: 0 }, // ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<3000"],
    checks: ["rate>0.95"],
  },
};

// ---------------------------------------------------------------------------
// Setup — runs once before any VUs start
// ---------------------------------------------------------------------------

/**
 * Validates required env vars and resolves the Clerk Frontend API origin.
 *
 * If CLERK_FRONTEND_API_URL is not set, a throwaway sign-in token is created
 * solely to extract the origin from its `url` field.
 */
export function setup(): { frontendApi: string } {
  if (!CLERK_SECRET_KEY || !CLERK_USER_ID) {
    fail("CLERK_SECRET_KEY and CLERK_USER_ID are required");
  }

  if (CLERK_FRONTEND_API_URL) {
    return { frontendApi: CLERK_FRONTEND_API_URL };
  }

  // Derive the Frontend API origin from a throwaway sign-in token.
  const tokenRes = http.post(
    "https://api.clerk.com/v1/sign_in_tokens",
    JSON.stringify({ user_id: CLERK_USER_ID, expires_in_seconds: 60 }),
    {
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (tokenRes.status !== 200) {
    fail(`setup: sign_in_tokens failed: ${tokenRes.status} ${tokenRes.body}`);
  }

  const tokenBody = tokenRes.json() as { url: string };
  try {
    return { frontendApi: new URL(tokenBody.url).origin };
  } catch {
    fail(
      "setup: could not parse CLERK_FRONTEND_API_URL from token response — set it explicitly",
    );
  }
}

// ---------------------------------------------------------------------------
// Default function — one iteration per VU per loop
// ---------------------------------------------------------------------------

export default function userJourney(data: { frontendApi: string }) {
  const jwt = clerkAuth(data.frontendApi);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
  };

  // 1. Run a race (3–10 random racers)
  const count = Math.floor(Math.random() * 8) + 3;
  const racers = shuffle(ANIMAL_IDS)
    .slice(0, count)
    .map((id, lane) => ({ id, lane }));

  const raceRes = runRace(racers, headers);
  check(raceRes, {
    "race: status 200": (r) => r.status === 200,
    "race: has ticks": (r) => {
      if (r.status !== 200) return false;
      return Array.isArray((r.json() as unknown as RaceResponse).ticks);
    },
    "race: has finishOrder": (r) => {
      if (r.status !== 200) return false;
      return Array.isArray((r.json() as unknown as RaceResponse).finishOrder);
    },
  });

  sleep(rand(5, 15)); // simulate watching the race replay (1 tick/s, 30–100 ticks)

  // 2. Check the stats leaderboard
  const statsRes = getStats(headers);
  check(statsRes, {
    "stats: status 200": (r) => r.status === 200,
    "stats: has animals": (r) => {
      if (r.status !== 200) return false;
      return Array.isArray((r.json() as unknown as StatsResponse).animals);
    },
  });

  sleep(rand(2, 5));

  // 3. Browse race history
  const racesRes = getRaces(headers);
  check(racesRes, {
    "races: status 200": (r) => r.status === 200,
    "races: has races": (r) => {
      if (r.status !== 200) return false;
      return Array.isArray((r.json() as unknown as RacesResponse).races);
    },
  });

  sleep(rand(1, 3));

  // 4. Fetch a specific race detail (30% of the time)
  if (Math.random() < 0.3 && racesRes.status === 200) {
    const firstRace = (racesRes.json() as unknown as RacesResponse).races?.[0];
    if (firstRace?.id) {
      const detailRes = getRaceDetail(firstRace.id, headers);
      check(detailRes, {
        "race detail: status 200": (r) => r.status === 200,
      });
      sleep(rand(1, 2));
    }
  }

  sleep(rand(3, 10)); // pause before next iteration
}
