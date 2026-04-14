import "./env" // validates all required env vars before anything else runs
import { logger } from "./instrumentation"
import { SeverityNumber } from "@opentelemetry/api-logs"
import app from "./app"
import { env } from "./env"
import { initDB } from "./db"

await initDB()

app.listen(env.PORT, "0.0.0.0", () => {
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    body: "Server started",
    attributes: { port: env.PORT },
  })
})
