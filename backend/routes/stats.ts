import { Router } from "express"
import { getAuth } from "@clerk/express"
import { SeverityNumber } from "@opentelemetry/api-logs"
import { logger } from "../instrumentation"
import { ANIMAL_IDS } from "../config"
import { deleteUserRaces, getStatsAggregates, getStatsHistory, getTotalRacesCount } from "../db"

interface AnimalStats {
  racer_id: string
  total_races: number
  wins: number
  losses: number
  win_rate: number
  luck: number
  win_streak: number
  loss_streak: number
  current_win_streak: number
  current_loss_streak: number
}

function findBy<K extends keyof AnimalStats>(
  animals: AnimalStats[],
  key: K,
  order: "max" | "min",
): AnimalStats | null {
  if (animals.length === 0) return null
  return animals.reduce((acc, a) => {
    if (order === "max") return a[key] > acc[key] ? a : acc
    return a[key] < acc[key] ? a : acc
  }, animals[0]!)
}

function racerStreaks(races: Array<{ position: number; max_pos: number }>): {
  win_streak: number
  loss_streak: number
  current_win_streak: number
  current_loss_streak: number
} {
  let currentWin = 0,
    currentLoss = 0,
    maxWin = 0,
    maxLoss = 0
  for (const { position, max_pos } of races) {
    const won = position < max_pos
    currentWin = won ? currentWin + 1 : 0
    currentLoss = won ? 0 : currentLoss + 1
    maxWin = Math.max(maxWin, currentWin)
    maxLoss = Math.max(maxLoss, currentLoss)
  }
  return { win_streak: maxWin, loss_streak: maxLoss, current_win_streak: currentWin, current_loss_streak: currentLoss }
}

function computeStreaks(
  history: Array<{ racer_id: string; position: number; max_pos: number }>,
): Record<string, ReturnType<typeof racerStreaks>> {
  const grouped: Record<string, { position: number; max_pos: number }[]> = {}
  for (const row of history) {
    grouped[row.racer_id] ??= []
    grouped[row.racer_id]!.push({ position: row.position, max_pos: row.max_pos })
  }
  return Object.fromEntries(Object.entries(grouped).map(([id, races]) => [id, racerStreaks(races)]))
}

function buildAggMap(
  aggregates: Array<{ racer_id: string; total_races: number; wins: number; losses: number }>,
): Record<string, { total_races: number; wins: number; losses: number }> {
  const map: Record<string, { total_races: number; wins: number; losses: number }> = {}
  for (const row of aggregates) {
    map[row.racer_id] = { total_races: row.total_races, wins: row.wins, losses: row.losses }
  }
  return map
}

const router = Router()

router.delete("/stats", async (req, res) => {
  const { userId } = getAuth(req)
  try {
    await deleteUserRaces(userId!)
    logger.emit({ severityNumber: SeverityNumber.INFO, body: "stats reset: all races deleted" })
    res.json({ ok: true })
  } catch (err) {
    logger.emit({ severityNumber: SeverityNumber.ERROR, body: "stats reset error", attributes: { error: String(err) } })
    res.status(500).json({ error: "Failed to reset stats" })
  }
})

router.get("/stats", async (req, res) => {
  const { userId } = getAuth(req)
  try {
    const [aggregates, history, total_races_run] = await Promise.all([
      getStatsAggregates(userId!),
      getStatsHistory(userId!),
      getTotalRacesCount(userId!),
    ])

    const streaks = computeStreaks(history)
    const aggMap = buildAggMap(aggregates)

    const animals: AnimalStats[] = ANIMAL_IDS.map((id) => {
      const agg = aggMap[id]
      const streak = streaks[id]
      if (!agg) {
        return { racer_id: id, total_races: 0, wins: 0, losses: 0, win_rate: 0, luck: 0, win_streak: 0, loss_streak: 0, current_win_streak: 0, current_loss_streak: 0 }
      }
      return {
        racer_id: id,
        total_races: agg.total_races,
        wins: agg.wins,
        losses: agg.losses,
        win_rate: agg.total_races > 0 ? agg.wins / agg.total_races : 0,
        luck: 0,
        win_streak: streak?.win_streak ?? 0,
        loss_streak: streak?.loss_streak ?? 0,
        current_win_streak: streak?.current_win_streak ?? 0,
        current_loss_streak: streak?.current_loss_streak ?? 0,
      }
    })

    const maxRaces = Math.max(...animals.map((a) => a.total_races), 0)
    for (const a of animals) {
      const participationRate = maxRaces > 0 ? a.total_races / maxRaces : 0
      a.luck = Math.round(a.win_rate * 70 + participationRate * 30)
    }

    animals.sort((a, b) => b.luck - a.luck)

    const raced = animals.filter((a) => a.total_races >= 1)

    res.json({
      animals,
      luckiest: findBy(raced, "win_rate", "max"),
      unluckiest: findBy(raced, "win_rate", "min"),
      win_streak_holder: findBy(raced, "win_streak", "max"),
      loss_streak_holder: findBy(raced, "loss_streak", "max"),
      total_races_run,
    })
  } catch (err) {
    logger.emit({ severityNumber: SeverityNumber.ERROR, body: "stats error", attributes: { error: String(err) } })
    res.status(500).json({ error: "Failed to load stats" })
  }
})

export default router
