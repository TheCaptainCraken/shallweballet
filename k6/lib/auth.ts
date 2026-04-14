import http from "k6/http";
import { fail } from "k6";
import { CLERK_SECRET_KEY, CLERK_USER_ID } from "./config.ts";

// ---------------------------------------------------------------------------
// Per-VU state
//
// In k6, module-level variables are isolated per virtual user — each VU gets
// its own copy when the script is initialised. This makes module-scope the
// right place to cache auth tokens without any shared-state concerns.
// ---------------------------------------------------------------------------

let vuJwt = "";
let vuSessionId = "";
let vuJwtExpiry = 0; // Unix seconds — compared against Date.now() / 1000
let vuDevBrowserToken = ""; // __clerk_db_jwt for Clerk dev instances

// ---------------------------------------------------------------------------
// clerkAuth
// ---------------------------------------------------------------------------

/**
 * Returns a valid Clerk JWT for the current VU.
 *
 * Three code paths, tried in order:
 *
 * 1. **Cache hit** — reuse the existing JWT if it has >10 s left.
 * 2. **Session refresh** — if a session exists but the JWT is about to expire,
 *    hit the lightweight token endpoint instead of creating a full sign-in.
 *    This avoids rate-limiting on /v1/client/sign_ins.
 * 3. **Full sign-in** — mint a one-time ticket via the Clerk Backend API, then
 *    exchange it for a session JWT via the Frontend API. Falls back here on the
 *    first call per VU or whenever the session refresh fails.
 *
 * @param frontendApi - Clerk Frontend API origin (e.g. https://your-app.clerk.accounts.dev)
 */
export function clerkAuth(frontendApi: string): string {
  const now = Date.now() / 1000;

  // --- 1. Cache hit ---
  if (vuJwt && vuJwtExpiry > now + 10) {
    return vuJwt;
  }

  // --- 2. Session refresh ---
  if (vuSessionId) {
    const dbJwtParam = vuDevBrowserToken
      ? `?__clerk_db_jwt=${encodeURIComponent(vuDevBrowserToken)}`
      : "";

    const refreshRes = http.post(
      `${frontendApi}/v1/client/sessions/${vuSessionId}/tokens${dbJwtParam}`,
      null,
      {},
    );

    if (refreshRes.status === 200) {
      const body = refreshRes.json() as { jwt?: string };
      if (body.jwt) {
        vuJwt = body.jwt;
        vuJwtExpiry = now + 55; // JWTs have a 60 s lifetime; refresh 5 s early
        return vuJwt;
      }
    }

    // Refresh failed — clear stale session state and fall through to full sign-in
    vuDevBrowserToken = "";
    vuSessionId = "";
  }

  // --- 3. Full sign-in ---

  // Clerk dev instances require a dev-browser token on every Frontend API call.
  // We obtain it once per VU and pass it explicitly as a query param — more
  // reliable than relying on k6's cookie jar for cross-request state.
  if (!vuDevBrowserToken) {
    const dbRes = http.post(`${frontendApi}/v1/dev_browser`, null);
    if (dbRes.status !== 200) {
      fail(`clerkAuth: dev_browser init failed: ${dbRes.status} ${dbRes.body}`);
    }
    const dbBody = dbRes.json() as { token?: string };
    if (!dbBody.token) {
      fail(`clerkAuth: dev_browser response missing token: ${dbRes.body}`);
    }
    vuDevBrowserToken = dbBody.token!;
  }

  // Mint a short-lived one-time sign-in ticket via the Clerk Backend API.
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
    fail(`clerkAuth: sign_in_tokens failed: ${tokenRes.status} ${tokenRes.body}`);
  }
  const tokenBody = tokenRes.json() as { token: string };
  if (!tokenBody.token) {
    fail(`clerkAuth: sign_in_tokens response missing token: ${tokenRes.body}`);
  }

  // Exchange the ticket for a session via the Frontend API.
  const signInRes = http.post(
    `${frontendApi}/v1/client/sign_ins?__clerk_db_jwt=${encodeURIComponent(vuDevBrowserToken)}`,
    `strategy=ticket&ticket=${encodeURIComponent(tokenBody.token)}`,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );
  if (signInRes.status !== 200) {
    fail(`clerkAuth: ticket exchange failed: ${signInRes.status} ${signInRes.body}`);
  }

  type SignInBody = {
    client?: { sessions?: Array<{ id: string; last_active_token?: { jwt?: string } }> };
  };
  const signInBody = signInRes.json() as SignInBody;
  const session = signInBody.client?.sessions?.[0];
  const jwt = session?.last_active_token?.jwt;

  if (!jwt || !session?.id) {
    fail(`clerkAuth: no JWT/session in sign-in response: ${signInRes.body}`);
  }

  vuJwt = jwt!;
  vuSessionId = session!.id;
  vuJwtExpiry = now + 55;
  return vuJwt;
}
