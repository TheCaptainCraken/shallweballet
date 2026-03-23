import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useApi } from "@/lib/use-api"

interface OrgSummary {
  id: number
  name: string
  admin_user_id: string
  member_count: number
  joined_at: string
}

export default function Orgs() {
  const navigate = useNavigate()
  const api = useApi()
  const [orgs, setOrgs] = useState<OrgSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [joinOpen, setJoinOpen] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  function loadOrgs() {
    setLoading(true)
    api("/api/orgs")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: OrgSummary[]) => {
        setOrgs(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(String(err))
        setLoading(false)
      })
  }

  useEffect(() => {
    loadOrgs()
  }, [])

  async function handleCreate() {
    if (!createName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const r = await api("/api/orgs", { method: "POST", body: JSON.stringify({ name: createName.trim() }) })
      if (!r.ok) {
        const data = await r.json()
        throw new Error(data.error ?? `HTTP ${r.status}`)
      }
      setCreateOpen(false)
      setCreateName("")
      loadOrgs()
    } catch (err) {
      setCreateError(String(err))
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setJoining(true)
    setJoinError(null)
    try {
      const r = await api("/api/orgs/join", { method: "POST", body: JSON.stringify({ code: joinCode.trim() }) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
      setJoinOpen(false)
      setJoinCode("")
      navigate(`/orgs/${data.org_id}`)
    } catch (err) {
      setJoinError(String(err))
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="min-h-svh bg-background px-4 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setJoinError(null); setJoinOpen(true) }}>
              Join Org
            </Button>
            <Button size="sm" onClick={() => { setCreateError(null); setCreateOpen(true) }}>
              Create Org
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && orgs.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-4xl">🏢</p>
            <h2 className="text-xl font-semibold">No Organizations Yet</h2>
            <p className="text-sm text-foreground/60">Create one or join with an invite code.</p>
          </div>
        )}

        {!loading && orgs.length > 0 && (
          <div className="space-y-3">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => navigate(`/orgs/${org.id}`)}
                className="w-full rounded-xl border border-border/50 bg-background/80 px-5 py-4 text-left transition hover:bg-foreground/5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{org.name}</p>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {org.member_count} member{org.member_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-foreground/40">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Organization name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !createName.trim()}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            {joinError && <p className="text-sm text-destructive">{joinError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>Cancel</Button>
            <Button onClick={handleJoin} disabled={joining || !joinCode.trim()}>
              {joining ? "Joining…" : "Join"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
