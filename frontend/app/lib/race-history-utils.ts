import { RACE_LENGTH } from "@/components/race/race-constants"

export function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Returns a map of racer_id → fractional arrival time (seconds), interpolated within the crossing tick. */
export function computeArrivalTicks(
  ticks: Array<Record<string, number>>,
): Record<string, number> {
  const positions: Record<string, number> = {}
  const arrivals: Record<string, number> = {}
  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i]
    for (const [id, speed] of Object.entries(tick)) {
      const prev = positions[id] ?? 0
      const next = prev + speed
      positions[id] = next
      if (arrivals[id] === undefined && next >= RACE_LENGTH) {
        arrivals[id] = i + (RACE_LENGTH - prev) / speed
      }
    }
  }
  return arrivals
}
