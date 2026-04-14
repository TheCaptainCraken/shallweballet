import { sql } from "bun"
import { tracer } from "./instrumentation"
import type { Racer } from "./simulation/types"

export async function initDB(retries = 10, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS races (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
      await sql`
        CREATE TABLE IF NOT EXISTS race_participants (
          id SERIAL PRIMARY KEY,
          race_id INT NOT NULL REFERENCES races(id),
          racer_id TEXT NOT NULL,
          lane INT NOT NULL,
          position INT NOT NULL
        )
      `
      await sql`ALTER TABLE races ADD COLUMN IF NOT EXISTS race_ticks JSONB`
      await sql`ALTER TABLE races ADD COLUMN IF NOT EXISTS user_id TEXT`
      return
    } catch (err) {
      if (i === retries - 1) throw err
      console.warn(`DB not ready, retrying in ${delayMs}ms... (${i + 1}/${retries})`)
      await Bun.sleep(delayMs)
    }
  }
}

export async function saveRace(
  racers: Racer[],
  finishOrder: string[],
  ticks: Array<Record<string, number>>,
  userId: string,
) {
  return tracer.startActiveSpan("db.saveRace", async (span) => {
    span.setAttribute("db.racer_count", racers.length)
    span.setAttribute("db.tick_count", ticks.length)

    const participants = racers.map((racer) => ({
      racer_id: racer.id,
      lane: racer.lane,
      position: finishOrder.indexOf(racer.id) + 1,
    }))

    try {
      await sql.begin(async (tx) => {
        const insertRaceSpan = tracer.startSpan("db.saveRace.insert_race")
        const [{ id: raceId }] =
          await tx`INSERT INTO races (race_ticks, user_id) VALUES (${JSON.stringify(ticks)}, ${userId}) RETURNING id`
        insertRaceSpan.setAttribute("db.race_id", raceId)
        insertRaceSpan.end()

        const insertParticipantsSpan = tracer.startSpan("db.saveRace.insert_participants")
        insertParticipantsSpan.setAttribute("db.participant_count", participants.length)
        await tx`INSERT INTO race_participants ${tx(participants.map((p) => ({ ...p, race_id: raceId })))}`
        insertParticipantsSpan.end()
      })
    } finally {
      span.end()
    }
  })
}

export async function deleteUserRaces(userId: string) {
  return tracer.startActiveSpan("db.deleteUserRaces", async (span) => {
    span.setAttribute("db.user_id", userId)
    try {
      await sql`DELETE FROM race_participants WHERE race_id IN (SELECT id FROM races WHERE user_id = ${userId})`
      await sql`DELETE FROM races WHERE user_id = ${userId}`
    } finally {
      span.end()
    }
  })
}

export async function getStatsAggregates(userId: string) {
  return tracer.startActiveSpan("db.getStatsAggregates", async (span) => {
    span.setAttribute("db.user_id", userId)
    try {
      const rows = await sql`
        SELECT
          rp.racer_id,
          COUNT(*)::int AS total_races,
          COUNT(*) FILTER (WHERE rp.position < race_max.max_pos)::int AS wins,
          COUNT(*) FILTER (WHERE rp.position = race_max.max_pos)::int AS losses
        FROM race_participants rp
        JOIN races r ON rp.race_id = r.id
        JOIN (
          SELECT race_id, MAX(position) AS max_pos
          FROM race_participants GROUP BY race_id
        ) race_max ON rp.race_id = race_max.race_id
        WHERE r.user_id = ${userId}
        GROUP BY rp.racer_id
      ` as unknown as Array<{ racer_id: string; total_races: number; wins: number; losses: number }>
      span.setAttribute("db.row_count", rows.length)
      return rows
    } finally {
      span.end()
    }
  })
}

export async function getStatsHistory(userId: string) {
  return tracer.startActiveSpan("db.getStatsHistory", async (span) => {
    span.setAttribute("db.user_id", userId)
    try {
      const rows = await sql`
        SELECT rp.racer_id, rp.position, race_max.max_pos
        FROM race_participants rp
        JOIN races r ON rp.race_id = r.id
        JOIN (
          SELECT race_id, MAX(position) AS max_pos
          FROM race_participants GROUP BY race_id
        ) race_max ON rp.race_id = race_max.race_id
        AND r.user_id = ${userId}
        ORDER BY rp.racer_id, r.created_at ASC
      ` as unknown as Array<{ racer_id: string; position: number; max_pos: number }>
      span.setAttribute("db.row_count", rows.length)
      return rows
    } finally {
      span.end()
    }
  })
}

export async function getTotalRacesCount(userId: string): Promise<number> {
  return tracer.startActiveSpan("db.getTotalRacesCount", async (span) => {
    span.setAttribute("db.user_id", userId)
    try {
      const rows = (await sql`
        SELECT COUNT(*)::int AS total FROM races WHERE user_id = ${userId}
      `) as unknown as Array<{ total: number }>
      const total = rows[0]?.total ?? 0
      span.setAttribute("db.total", total)
      return total
    } finally {
      span.end()
    }
  })
}

export async function getRaceHistory(userId: string, before?: string, limit = 20) {
  return tracer.startActiveSpan("db.getRaceHistory", async (span) => {
    span.setAttribute("db.user_id", userId)
    span.setAttribute("db.limit", limit)
    try {
      const rows = await sql`
        SELECT r.id, r.created_at, r.race_ticks IS NOT NULL AS has_ticks,
          json_agg(json_build_object('racer_id', rp.racer_id, 'position', rp.position, 'lane', rp.lane)
            ORDER BY rp.position ASC) AS participants
        FROM races r
        JOIN race_participants rp ON rp.race_id = r.id
        WHERE r.user_id = ${userId}
          AND (${before ?? null}::text IS NULL OR r.created_at < ${before ?? null}::timestamptz)
        GROUP BY r.id ORDER BY r.created_at DESC LIMIT ${limit}
      ` as unknown as Array<{
        id: number
        created_at: string
        has_ticks: boolean
        participants: Array<{ racer_id: string; position: number; lane: number }>
      }>
      span.setAttribute("db.row_count", rows.length)
      return rows
    } finally {
      span.end()
    }
  })
}

export async function getRaceById(id: number, userId: string) {
  return tracer.startActiveSpan("db.getRaceById", async (span) => {
    span.setAttribute("db.race_id", id)
    try {
      const rows = (await sql`
        SELECT r.id, r.created_at, r.race_ticks,
          json_agg(json_build_object('racer_id', rp.racer_id, 'position', rp.position, 'lane', rp.lane)
            ORDER BY rp.position ASC) AS participants
        FROM races r
        JOIN race_participants rp ON rp.race_id = r.id
        WHERE r.id = ${id} AND r.user_id = ${userId}
        GROUP BY r.id
      `) as unknown as Array<{
        id: number
        created_at: string
        race_ticks: Array<Record<string, number>> | null
        participants: Array<{ racer_id: string; position: number; lane: number }>
      }>
      const row = rows[0]
      span.setAttribute("db.found", row !== undefined)
      if (!row) return null
      return {
        ...row,
        race_ticks: typeof row.race_ticks === "string" ? JSON.parse(row.race_ticks) : row.race_ticks,
      }
    } finally {
      span.end()
    }
  })
}
