import http from "k6/http";
import type { RefinedResponse, ResponseType } from "k6/http";
import { BACKEND_URL } from "./config.ts";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface Racer {
  id: string;
  lane: number;
}

export interface RaceResponse {
  ticks: unknown[][];
  finishOrder: string[];
}

export interface AnimalStats {
  id: string;
  wins: number;
  races: number;
  winRate: number;
  streak: number;
}

export interface StatsResponse {
  animals: AnimalStats[];
}

export interface RaceSummary {
  id: number;
  createdAt: string;
  participants: Racer[];
}

export interface RacesResponse {
  races: RaceSummary[];
}

export interface RaceDetailResponse {
  id: number;
  createdAt: string;
  participants: Racer[];
  finishOrder: string[];
}

// ---------------------------------------------------------------------------
// API client functions
// ---------------------------------------------------------------------------

type Headers = Record<string, string>;

/**
 * POST /api/race
 * Submits a list of racers and returns the full pre-computed tick data and
 * finish order for the race.
 */
export function runRace(
  racers: Racer[],
  headers: Headers,
): RefinedResponse<ResponseType> {
  return http.post(
    `${BACKEND_URL}/api/race`,
    JSON.stringify({ racers }),
    { headers },
  );
}

/**
 * GET /api/stats
 * Returns win rates, streaks, and total race counts per animal.
 */
export function getStats(headers: Headers): RefinedResponse<ResponseType> {
  return http.get(`${BACKEND_URL}/api/stats`, { headers });
}

/**
 * GET /api/races
 * Returns the paginated race history list.
 */
export function getRaces(headers: Headers): RefinedResponse<ResponseType> {
  return http.get(`${BACKEND_URL}/api/races`, { headers });
}

/**
 * GET /api/races/:id
 * Returns the full detail for a single past race.
 */
export function getRaceDetail(
  id: number,
  headers: Headers,
): RefinedResponse<ResponseType> {
  return http.get(`${BACKEND_URL}/api/races/${id}`, { headers });
}
