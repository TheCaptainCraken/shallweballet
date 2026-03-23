import { sql } from "bun"
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
      await sql`
        CREATE TABLE IF NOT EXISTS organizations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          admin_user_id TEXT NOT NULL,
          invite_code TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
      await sql`
        CREATE TABLE IF NOT EXISTS org_members (
          org_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          joined_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (org_id, user_id)
        )
      `
      await sql`ALTER TABLE races ADD COLUMN IF NOT EXISTS org_id INT REFERENCES organizations(id) ON DELETE SET NULL`
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
  orgId?: number | null,
) {
  const [{ id: raceId }] =
    await sql`INSERT INTO races (race_ticks, user_id, org_id) VALUES (${JSON.stringify(ticks)}, ${userId}, ${orgId ?? null}) RETURNING id`

  const participants = racers.map((racer) => ({
    race_id: raceId,
    racer_id: racer.id,
    lane: racer.lane,
    position: finishOrder.indexOf(racer.id) + 1,
  }))

  await sql`INSERT INTO race_participants ${sql(participants)}`
}

export async function getRaceHistory(userId: string, before?: string, limit = 20) {
  return sql`
    SELECT r.id, r.created_at, r.race_ticks IS NOT NULL AS has_ticks,
      json_agg(json_build_object('racer_id', rp.racer_id, 'position', rp.position, 'lane', rp.lane)
        ORDER BY rp.position ASC) AS participants
    FROM races r
    JOIN race_participants rp ON rp.race_id = r.id
    WHERE r.user_id = ${userId}
      AND (${before ?? null}::text IS NULL OR r.created_at < ${before ?? null}::timestamptz)
    GROUP BY r.id ORDER BY r.created_at DESC LIMIT ${limit}
  ` as unknown as Promise<
    Array<{
      id: number
      created_at: string
      has_ticks: boolean
      participants: Array<{ racer_id: string; position: number; lane: number }>
    }>
  >
}

export async function getRaceById(id: number, userId: string) {
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
  if (!row) return null
  return {
    ...row,
    race_ticks: typeof row.race_ticks === "string" ? JSON.parse(row.race_ticks) : row.race_ticks,
  }
}

// --- Organizations ---

export async function createOrg(
  name: string,
  adminUserId: string,
): Promise<{ id: number; name: string; invite_code: string; admin_user_id: string; created_at: string }> {
  const inviteCode = crypto.randomUUID()
  const result = await sql.begin(async (tx) => {
    const [org] = (await tx`
      INSERT INTO organizations (name, admin_user_id, invite_code)
      VALUES (${name}, ${adminUserId}, ${inviteCode})
      RETURNING id, name, invite_code, admin_user_id, created_at
    `) as unknown as Array<{ id: number; name: string; invite_code: string; admin_user_id: string; created_at: string }>
    await tx`INSERT INTO org_members (org_id, user_id) VALUES (${org!.id}, ${adminUserId})`
    return org!
  })
  return result
}

export async function getUserOrgs(
  userId: string,
): Promise<Array<{ id: number; name: string; admin_user_id: string; member_count: number; joined_at: string }>> {
  return sql`
    SELECT o.id, o.name, o.admin_user_id, om.joined_at,
      COUNT(om2.user_id)::int AS member_count
    FROM organizations o
    JOIN org_members om ON om.org_id = o.id AND om.user_id = ${userId}
    LEFT JOIN org_members om2 ON om2.org_id = o.id
    GROUP BY o.id, o.name, o.admin_user_id, om.joined_at
    ORDER BY om.joined_at DESC
  ` as unknown as Promise<
    Array<{ id: number; name: string; admin_user_id: string; member_count: number; joined_at: string }>
  >
}

export async function getOrgById(id: number): Promise<{
  id: number
  name: string
  admin_user_id: string
  invite_code: string
  created_at: string
  member_count: number
} | null> {
  const rows = (await sql`
    SELECT o.id, o.name, o.admin_user_id, o.invite_code, o.created_at,
      COUNT(om.user_id)::int AS member_count
    FROM organizations o
    LEFT JOIN org_members om ON om.org_id = o.id
    WHERE o.id = ${id}
    GROUP BY o.id
  `) as unknown as Array<{
    id: number
    name: string
    admin_user_id: string
    invite_code: string
    created_at: string
    member_count: number
  }>
  return rows[0] ?? null
}

export async function joinOrg(inviteCode: string, userId: string): Promise<{ org_id: number }> {
  const orgs = (await sql`
    SELECT id FROM organizations WHERE invite_code = ${inviteCode}
  `) as unknown as Array<{ id: number }>
  if (orgs.length === 0) throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" })
  const orgId = orgs[0]!.id
  const result = (await sql`
    INSERT INTO org_members (org_id, user_id) VALUES (${orgId}, ${userId})
    ON CONFLICT DO NOTHING
  `) as unknown as { affectedRows: number }
  if (result.affectedRows === 0) throw Object.assign(new Error("ALREADY_MEMBER"), { code: "ALREADY_MEMBER" })
  return { org_id: orgId }
}

export async function leaveOrg(orgId: number, userId: string): Promise<void> {
  const admin = await isOrgAdmin(orgId, userId)
  if (admin) throw Object.assign(new Error("ADMIN_CANNOT_LEAVE"), { code: "ADMIN_CANNOT_LEAVE" })
  await sql`DELETE FROM org_members WHERE org_id = ${orgId} AND user_id = ${userId}`
}

export async function deleteOrg(orgId: number): Promise<void> {
  await sql`DELETE FROM organizations WHERE id = ${orgId}`
}

export async function regenerateInviteCode(orgId: number): Promise<string> {
  const newCode = crypto.randomUUID()
  await sql`UPDATE organizations SET invite_code = ${newCode} WHERE id = ${orgId}`
  return newCode
}

export async function isOrgAdmin(orgId: number, userId: string): Promise<boolean> {
  const rows = (await sql`
    SELECT 1 FROM organizations WHERE id = ${orgId} AND admin_user_id = ${userId}
  `) as unknown as Array<unknown>
  return rows.length > 0
}

export async function isOrgMember(orgId: number, userId: string): Promise<boolean> {
  const rows = (await sql`
    SELECT 1 FROM org_members WHERE org_id = ${orgId} AND user_id = ${userId}
  `) as unknown as Array<unknown>
  return rows.length > 0
}
