import express from "express"
import cors from "cors"
import { clerkMiddleware, requireAuth } from "@clerk/express"
import { CORS_ORIGIN } from "./config"
import statusRouter from "./routes/status"
import raceRouter from "./routes/race"
import statsRouter from "./routes/stats"
import historyRouter from "./routes/history"

const app = express()

app.use(cors({ origin: CORS_ORIGIN }))
app.use(express.json())
app.use(clerkMiddleware())

app.use("/api", statusRouter)
app.use("/api", requireAuth(), raceRouter)
app.use("/api", requireAuth(), statsRouter)
app.use("/api", requireAuth(), historyRouter)

export default app
