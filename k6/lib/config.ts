// ---------------------------------------------------------------------------
// Environment configuration
// All __ENV reads are centralised here so every other module imports typed
// constants rather than reaching into __ENV directly.
// ---------------------------------------------------------------------------

export const BACKEND_URL = __ENV.BACKEND_URL || "http://localhost:3000";

// Clerk Backend API key — used to mint sign-in tokens server-side.
export const CLERK_SECRET_KEY = __ENV.CLERK_SECRET_KEY || "";

// The Clerk user that every VU will sign in as during the load test.
export const CLERK_USER_ID = __ENV.CLERK_USER_ID || "";

// Optional: if omitted, setup() will derive it from the sign-in token URL.
export const CLERK_FRONTEND_API_URL = __ENV.CLERK_FRONTEND_API_URL || "";

// ---------------------------------------------------------------------------
// Domain constants
// ---------------------------------------------------------------------------

/** Full set of raceable animal IDs known to the backend. */
export const ANIMAL_IDS = [
  "animal-beaver",
  "animal-bee",
  "animal-bunny",
  "animal-cat",
  "animal-caterpillar",
  "animal-chick",
  "animal-cow",
  "animal-crab",
  "animal-deer",
  "animal-dog",
  "animal-elephant",
  "animal-fish",
  "animal-fox",
  "animal-giraffe",
  "animal-hog",
  "animal-koala",
  "animal-lion",
  "animal-monkey",
  "animal-panda",
  "animal-parrot",
  "animal-penguin",
  "animal-pig",
  "animal-polar",
  "animal-tiger",
] as const;

export type AnimalId = (typeof ANIMAL_IDS)[number];
