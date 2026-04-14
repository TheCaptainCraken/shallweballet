import { Router } from "express"
import { getAuth } from "@clerk/express"
import { context, ROOT_CONTEXT } from "@opentelemetry/api"
import { SeverityNumber } from "@opentelemetry/api-logs"
import { logger, tracer } from "../instrumentation"
import { simulateRace } from "../simulation/engine"
import type { Racer } from "../simulation/types"
import { saveRace } from "../db"

const router = Router()

router.post("/race", async (req, res) => {
  const { userId } = getAuth(req)
  const { racers } = req.body as { racers?: Racer[] }

  tracer.startActiveSpan("race.handle", async (span) => {
    let valid = false
    tracer.startActiveSpan("race.validate", (validateSpan) => {
      valid = Array.isArray(racers) && racers.length > 0
      validateSpan.setAttribute("race.valid", valid)
      validateSpan.setAttribute("race.racer_count", Array.isArray(racers) ? racers.length : 0)
      validateSpan.end()
    })

    if (!valid) {
      span.setAttribute("race.valid", false)
      span.end()
      res.status(400).json({ error: "racers must be a non-empty array" })
      return
    }

    span.setAttribute("race.racer_count", racers!.length)

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      body: "Race request received",
      attributes: { racerCount: racers!.length },
    })

    const result = simulateRace(racers!)

    span.setAttribute("race.tick_count", result.ticks.length)
    span.setAttribute("race.winner", result.finishOrder[0] ?? "none")
    span.setAttribute("race.loser", result.finishOrder.at(-1) ?? "none")
    span.setAttribute("race.finish_order", result.finishOrder.join(","))

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      body: "Race completed",
      attributes: {
        racerCount: racers!.length,
        tickCount: result.ticks.length,
        winner: result.finishOrder[0] ?? null,
        finishOrder: result.finishOrder.join(","),
      },
    })

    span.end()
    res.json(result)

    context.with(ROOT_CONTEXT, () => {
      tracer.startActiveSpan("race.persist", async (persistSpan) => {
        persistSpan.setAttribute("race.persist.async", true)
        try {
          await saveRace(racers!, result.finishOrder, result.ticks, userId!)
        } catch (err) {
          logger.emit({ severityNumber: SeverityNumber.ERROR, body: "saveRace failed", attributes: { error: String(err) } })
        } finally {
          persistSpan.end()
        }
      })
    })
  })
})

export default router
