import { Router } from "express"
import { getAuth } from "@clerk/express"
import { sql } from "bun"
import { SeverityNumber } from "@opentelemetry/api-logs"
import { logger } from "../instrumentation"
import {
  createOrg,
  getUserOrgs,
  getOrgById,
  joinOrg,
  leaveOrg,
  deleteOrg,
  regenerateInviteCode,
  isOrgAdmin,
  isOrgMember,
} from "../db"
import { computeStats } from "../lib/stats"

const router = Router()

// POST /orgs — create org
router.post("/orgs", async (req, res) => {
  const { userId } = getAuth(req)
  const { name } = req.body as { name?: string }
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" })
    return
  }
  try {
    const org = await createOrg(name.trim(), userId!)
    res.status(201).json(org)
  } catch (err) {
    logger.emit({ severityNumber: SeverityNumber.ERROR, body: "createOrg error", attributes: { error: String(err) } })
    res.status(500).json({ error: "Failed to create organization" })
  }
})

// GET /orgs — list user's orgs
router.get("/orgs", async (req, res) => {
  const { userId } = getAuth(req)
  try {
    const orgs = await getUserOrgs(userId!)
    res.json(orgs)
  } catch (err) {
    logger.emit({ severityNumber: SeverityNumber.ERROR, body: "getUserOrgs error", attributes: { error: String(err) } })
    res.status(500).json({ error: "Failed to list organizations" })
  }
})

// POST /orgs/join — join by invite code
router.post("/orgs/join", async (req, res) => {
  const { userId } = getAuth(req)
  const { code } = req.body as { code?: string }
  if (!code?.trim()) {
    res.status(400).json({ error: "code is required" })
    return
  }
  try {
    const result = await joinOrg(code.trim(), userId!)
    res.json(result)
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === "NOT_FOUND") {
      res.status(404).json({ error: "Invalid invite code" })
    } else if (code === "ALREADY_MEMBER") {
      res.status(409).json({ error: "Already a member of this organization" })
    } else {
      logger.emit({ severityNumber: SeverityNumber.ERROR, body: "joinOrg error", attributes: { error: String(err) } })
      res.status(500).json({ error: "Failed to join organization" })
    }
  }
})

// GET /orgs/:id — get org detail
router.get("/orgs/:id", async (req, res) => {
  const { userId } = getAuth(req)
  const id = Number.parseInt(req.params.id!)
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid org id" })
    return
  }
  try {
    const org = await getOrgById(id)
    if (!org) {
      res.status(404).json({ error: "Organization not found" })
      return
    }
    const member = await isOrgMember(id, userId!)
    if (!member) {
      res.status(403).json({ error: "Not a member of this organization" })
      return
    }
    const admin = await isOrgAdmin(id, userId!)
    const { invite_code, ...orgWithoutCode } = org
    res.json({ ...orgWithoutCode, isAdmin: admin, ...(admin ? { invite_code } : {}) })
  } catch (err) {
    logger.emit({ severityNumber: SeverityNumber.ERROR, body: "getOrg error", attributes: { error: String(err) } })
    res.status(500).json({ error: "Failed to get organization" })
  }
})

// DELETE /orgs/:id — delete org (admin only)
router.delete("/orgs/:id", async (req, res) => {
  const { userId } = getAuth(req)
  const id = Number.parseInt(req.params.id!)
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid org id" })
    return
  }
  try {
    const admin = await isOrgAdmin(id, userId!)
    if (!admin) {
      res.status(403).json({ error: "Only the admin can delete this organization" })
      return
    }
    await deleteOrg(id)
    res.json({ ok: true })
  } catch (err) {
    logger.emit({ severityNumber: SeverityNumber.ERROR, body: "deleteOrg error", attributes: { error: String(err) } })
    res.status(500).json({ error: "Failed to delete organization" })
  }
})

// POST /orgs/:id/invite/regenerate — regenerate invite code (admin only)
router.post("/orgs/:id/invite/regenerate", async (req, res) => {
  const { userId } = getAuth(req)
  const id = Number.parseInt(req.params.id!)
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid org id" })
    return
  }
  try {
    const admin = await isOrgAdmin(id, userId!)
    if (!admin) {
      res.status(403).json({ error: "Only the admin can regenerate the invite code" })
      return
    }
    const invite_code = await regenerateInviteCode(id)
    res.json({ invite_code })
  } catch (err) {
    logger.emit({ severityNumber: SeverityNumber.ERROR, body: "regenerateInviteCode error", attributes: { error: String(err) } })
    res.status(500).json({ error: "Failed to regenerate invite code" })
  }
})

// POST /orgs/:id/leave — leave org (non-admin only)
router.post("/orgs/:id/leave", async (req, res) => {
  const { userId } = getAuth(req)
  const id = Number.parseInt(req.params.id!)
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid org id" })
    return
  }
  try {
    const member = await isOrgMember(id, userId!)
    if (!member) {
      res.status(403).json({ error: "Not a member of this organization" })
      return
    }
    await leaveOrg(id, userId!)
    res.json({ ok: true })
  } catch (err: unknown) {
    const errCode = (err as { code?: string }).code
    if (errCode === "ADMIN_CANNOT_LEAVE") {
      res.status(400).json({ error: "Admin cannot leave — delete the organization instead" })
    } else {
      logger.emit({ severityNumber: SeverityNumber.ERROR, body: "leaveOrg error", attributes: { error: String(err) } })
      res.status(500).json({ error: "Failed to leave organization" })
    }
  }
})

// GET /orgs/:id/stats — org stats (any member)
router.get("/orgs/:id/stats", async (req, res) => {
  const { userId } = getAuth(req)
  const id = Number.parseInt(req.params.id!)
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid org id" })
    return
  }
  try {
    const member = await isOrgMember(id, userId!)
    if (!member) {
      res.status(403).json({ error: "Not a member of this organization" })
      return
    }
    const result = await computeStats({ type: "org", orgId: id })
    res.json(result)
  } catch (err) {
    logger.emit({ severityNumber: SeverityNumber.ERROR, body: "orgStats error", attributes: { error: String(err) } })
    res.status(500).json({ error: "Failed to load org stats" })
  }
})

// DELETE /orgs/:id/stats — reset org stats (admin only)
router.delete("/orgs/:id/stats", async (req, res) => {
  const { userId } = getAuth(req)
  const id = Number.parseInt(req.params.id!)
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid org id" })
    return
  }
  try {
    const admin = await isOrgAdmin(id, userId!)
    if (!admin) {
      res.status(403).json({ error: "Only the admin can reset org stats" })
      return
    }
    await sql`DELETE FROM race_participants WHERE race_id IN (SELECT id FROM races WHERE org_id = ${id})`
    await sql`DELETE FROM races WHERE org_id = ${id}`
    logger.emit({ severityNumber: SeverityNumber.INFO, body: "org stats reset", attributes: { orgId: id } })
    res.json({ ok: true })
  } catch (err) {
    logger.emit({ severityNumber: SeverityNumber.ERROR, body: "orgStats reset error", attributes: { error: String(err) } })
    res.status(500).json({ error: "Failed to reset org stats" })
  }
})

export default router
