import express, { Router, type NextFunction, type Request, type Response } from "express"
import cors from "cors"
import { clerkMiddleware, requireAuth } from "@clerk/express"
import { SeverityNumber } from "@opentelemetry/api-logs"
import { logger } from "./instrumentation"
import { env } from "./env"
import statusRouter from "./routes/status"
import raceRouter from "./routes/race"
import statsRouter from "./routes/stats"
import historyRouter from "./routes/history"

const app = express()

app.use(cors({ origin: env.CORS_ORIGIN }))
app.use(express.json())
app.use(clerkMiddleware())

app.use("/api", statusRouter)

const protectedRouter = Router()
protectedRouter.use(requireAuth())
protectedRouter.use(raceRouter)
protectedRouter.use(statsRouter)
protectedRouter.use(historyRouter)
app.use("/api", protectedRouter)

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.emit({
    severityNumber: SeverityNumber.ERROR,
    body: "Unhandled error",
    attributes: { error: String(err) },
  })
  res.status(500).json({ error: "Internal server error" })
})

export default app
