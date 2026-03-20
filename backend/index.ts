import { logger } from "./instrumentation"
import { SeverityNumber } from "@opentelemetry/api-logs"
import app from "./app"
import { PORT } from "./config"
import { initDB } from "./db"

const REQUIRED_ENV_VARS = ["DATABASE_URL"] as const
for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: `Missing required environment variable: ${key}`,
    })
    process.exit(1)
  }
}

await initDB()

app.listen(PORT, "0.0.0.0", () => {
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    body: "Server started",
    attributes: { port: PORT },
  })
})
