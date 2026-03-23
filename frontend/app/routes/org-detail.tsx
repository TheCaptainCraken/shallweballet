import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { StreakBadge } from "@/components/CharacterCard"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CHARACTERS } from "@/lib/characters"
import { rankTextClass } from "@/components/race/race-constants"
import { useApi } from "@/lib/use-api"
import { HeroCard, type AnimalStats } from "@/components/HeroCard"

interface OrgDetail {
  id: number
  name: string
  admin_user_id: string
  member_count: number
  invite_code?: string
  isAdmin: boolean
}

interface StatsResponse {
  animals: AnimalStats[]
  luckiest: AnimalStats | null
  unluckiest: AnimalStats | null
  win_streak_holder: AnimalStats | null
  loss_streak_holder: AnimalStats | null
  total_races_run: number
}

function getCharacter(racerId: string) {
  return CHARACTERS.find((c) => c.id === racerId)
}

export default function OrgDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const api = useApi()

  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const [resetting, setResetting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api(`/api/orgs/${id}`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<OrgDetail>
      }),
      api(`/api/orgs/${id}/stats`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<StatsResponse>
      }),
    ])
      .then(([orgData, statsData]) => {
        setOrg(orgData)
        setInviteCode(orgData.invite_code ?? null)
        setStats(statsData)
        setLoading(false)
      })
      .catch((err) => {
        setError(String(err))
        setLoading(false)
      })
  }, [id])

  async function handleCopy() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const r = await api(`/api/orgs/${id}/invite/regenerate`, { method: "POST" })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
      setInviteCode(data.invite_code)
    } finally {
      setRegenerating(false)
    }
  }

  async function handleResetStats() {
    if (!confirm("Reset all org race stats? This cannot be undone.")) return
    setResetting(true)
    try {
      const r = await api(`/api/orgs/${id}/stats`, { method: "DELETE" })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const statsRes = await api(`/api/orgs/${id}/stats`)
      setStats(await statsRes.json())
    } finally {
      setResetting(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete organization "${org?.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const r = await api(`/api/orgs/${id}`, { method: "DELETE" })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      navigate("/orgs")
    } finally {
      setDeleting(false)
    }
  }

  async function handleLeave() {
    if (!confirm(`Leave organization "${org?.name}"?`)) return
    setLeaving(true)
    try {
      const r = await api(`/api/orgs/${id}/leave`, { method: "POST" })
      if (!r.ok) {
        const data = await r.json()
        throw new Error(data.error ?? `HTTP ${r.status}`)
      }
      navigate("/orgs")
    } finally {
      setLeaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !org || !stats) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">{error ?? "Failed to load organization"}</p>
        <Button variant="outline" onClick={() => navigate("/orgs")}>Back to Orgs</Button>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background px-4 py-6 md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/orgs")}>
            ← Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className="text-sm text-foreground/50">
              {org.member_count} member{org.member_count !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {org.isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete Org"}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleLeave} disabled={leaving}>
                {leaving ? "Leaving…" : "Leave Org"}
              </Button>
            )}
          </div>
        </div>

        {/* Invite code (admin only) */}
        {org.isAdmin && inviteCode && (
          <div className="rounded-xl border border-border/50 bg-background/80 p-4 space-y-2">
            <p className="text-xs font-semibold tracking-widest uppercase text-foreground/50">Invite Code</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-foreground/5 px-3 py-2 text-sm font-mono break-all">{inviteCode}</code>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
                {regenerating ? "…" : "Regenerate"}
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats.total_races_run === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-4xl">🏁</p>
            <h2 className="text-xl font-semibold">No Org Races Yet</h2>
            <p className="text-sm text-foreground/60">Run races tagged to this org to build the leaderboard.</p>
            <Button onClick={() => navigate("/character-select")}>Start Racing</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Hall of Fame</h2>
              <span className="text-sm text-foreground/50">
                {stats.total_races_run} race{stats.total_races_run !== 1 ? "s" : ""} run
              </span>
              {org.isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto text-destructive hover:text-destructive"
                  onClick={handleResetStats}
                  disabled={resetting}
                >
                  {resetting ? "Resetting…" : "Reset Org Stats"}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <HeroCard
                label="Luckiest Animal"
                animal={stats.luckiest}
                stat={stats.luckiest ? `${(stats.luckiest.win_rate * 100).toFixed(1)}% win rate` : ""}
                headerClass="bg-emerald-500/10 text-emerald-600"
                statClass="text-emerald-600"
              />
              <HeroCard
                label="Unluckiest Animal"
                animal={stats.unluckiest}
                stat={stats.unluckiest ? `${(stats.unluckiest.win_rate * 100).toFixed(1)}% win rate` : ""}
                headerClass="bg-rose-500/10 text-rose-600"
                statClass="text-rose-600"
              />
              <HeroCard
                label="Win Streak"
                animal={stats.win_streak_holder}
                stat={stats.win_streak_holder ? `${stats.win_streak_holder.win_streak} in a row` : ""}
                headerClass="bg-yellow-500/10 text-yellow-600"
                statClass="text-yellow-600"
              />
              <HeroCard
                label="Loss Streak"
                animal={stats.loss_streak_holder}
                stat={stats.loss_streak_holder ? `${stats.loss_streak_holder.loss_streak} in a row` : ""}
                headerClass="bg-sky-500/10 text-sky-600"
                statClass="text-sky-600"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-foreground/5 text-xs font-semibold tracking-widest uppercase text-foreground/50">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Animal</th>
                    <th className="px-4 py-3 text-center">Races</th>
                    <th className="px-4 py-3 text-center">Wins</th>
                    <th className="px-4 py-3 text-center">Losses</th>
                    <th className="px-4 py-3 text-left">Win Rate</th>
                    <th className="px-4 py-3 text-left">Participation</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const maxRaces = Math.max(...stats.animals.map((a) => a.total_races))
                    return stats.animals.map((animal, i) => {
                      const character = getCharacter(animal.racer_id)
                      const participationPct = maxRaces > 0 ? (animal.total_races / maxRaces) * 100 : 0
                      return (
                        <tr
                          key={animal.racer_id}
                          className="border-b border-border/30 last:border-0 hover:bg-foreground/5"
                        >
                          <td className={`px-4 py-3 font-bold ${rankTextClass(i + 1)}`}>{i + 1}</td>
                          <td className="px-4 py-3 font-medium">
                            <TooltipProvider>
                              <span className="flex items-center gap-1.5">
                                {character?.name ?? animal.racer_id}
                                <StreakBadge winStreak={animal.current_win_streak} lossStreak={animal.current_loss_streak} />
                              </span>
                            </TooltipProvider>
                          </td>
                          <td className="px-4 py-3 text-center text-foreground/60">{animal.total_races}</td>
                          <td className="px-4 py-3 text-center text-foreground/60">{animal.wins}</td>
                          <td className="px-4 py-3 text-center text-foreground/60">{animal.losses}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`font-semibold ${animal.win_rate >= 0.5 ? "text-emerald-600" : "text-orange-500"}`}>
                                {(animal.win_rate * 100).toFixed(1)}%
                              </span>
                              <div className="h-1.5 w-24 rounded-full bg-muted">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${animal.win_rate >= 0.5 ? "bg-emerald-500" : "bg-orange-400"}`}
                                  style={{ width: `${animal.win_rate * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-semibold text-sky-500">{participationPct.toFixed(1)}%</span>
                              <div className="h-1.5 w-24 rounded-full bg-muted">
                                <div
                                  className="h-1.5 rounded-full bg-sky-400 transition-all"
                                  style={{ width: `${participationPct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
