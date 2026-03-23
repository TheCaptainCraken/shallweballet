import { Router } from "express"
import { getAuth } from "@clerk/express"
import { sql } from "bun"
import { SeverityNumber } from "@opentelemetry/api-logs"
import { logger } from "../instrumentation"
import { computeStats } from "../lib/stats"

const router = Router()

router.delete("/stats", async (req, res) => {
  const { userId } = getAuth(req)
  try {
    await sql`DELETE FROM race_participants WHERE race_id IN (SELECT id FROM races WHERE user_id = ${userId!})`
    await sql`DELETE FROM races WHERE user_id = ${userId!}`
    logger.emit({
      severityNumber: SeverityNumber.INFO,
      body: "stats reset: all races deleted",
    })
    res.json({ ok: true })
  } catch (err) {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: "stats reset error",
      attributes: { error: String(err) },
    })
    res.status(500).json({ error: "Failed to reset stats" })
  }
})

router.get("/stats", async (req, res) => {
  const { userId } = getAuth(req)
  try {
    const result = await computeStats({ type: "user", userId: userId! })
    res.json(result)
  } catch (err) {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: "stats error",
      attributes: { error: String(err) },
    })
    res.status(500).json({ error: "Failed to load stats" })
  }
})

export default router
