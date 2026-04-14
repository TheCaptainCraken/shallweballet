function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  // ── Required ────────────────────────────────────────────────────────────────
  DATABASE_URL: required("DATABASE_URL"),

  // ── Optional (explicit defaults) ────────────────────────────────────────────
  PORT: Number.parseInt(optional("PORT", "3000"), 10),
  CORS_ORIGIN: optional("CORS_ORIGIN", "http://localhost:5173"),
  OTEL_SERVICE_NAME: optional("OTEL_SERVICE_NAME", "pi-demo-backend"),
  OTEL_EXPORTER_OTLP_ENDPOINT: optional(
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "http://localhost:4318",
  ),
} as const;
