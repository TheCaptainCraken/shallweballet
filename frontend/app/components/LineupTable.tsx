import { CHARACTERS } from "@/lib/characters"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { computeArrivalTicks } from "@/lib/race-history-utils"
import type { RaceParticipant } from "@/lib/api-types"

const MEDALS = ["🥇", "🥈", "🥉"]

export function LineupTable({
  participants,
  ticks,
}: {
  participants: RaceParticipant[]
  ticks: Array<Record<string, number>> | null
}) {
  const arrivals = ticks ? computeArrivalTicks(ticks) : null
  const sorted = [...participants].sort((a, b) => a.position - b.position)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14 pl-6 text-xs tracking-widest uppercase">Pos</TableHead>
          <TableHead className="text-xs tracking-widest uppercase">Racer</TableHead>
          {arrivals && (
            <TableHead className="pr-6 text-right text-xs tracking-widest uppercase">
              Arrival
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((p, i) => {
          const char = CHARACTERS.find((c) => c.id === p.racer_id)
          const isLast = i === sorted.length - 1
          const arrival = arrivals?.[p.racer_id]
          return (
            <TableRow key={p.racer_id} className="hover:bg-transparent">
              <TableCell className="pl-6 font-mono text-sm text-muted-foreground">
                {MEDALS[i] ?? `${i + 1}.`}
              </TableCell>
              <TableCell className={isLast ? "text-muted-foreground" : ""}>
                <span className="inline-flex items-center gap-1.5">
                  <img
                    src={`/character_previews/${p.racer_id}.png`}
                    alt={char?.name ?? p.racer_id}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  {char?.name ?? p.racer_id}
                  {isLast && <span className="text-xs">☕</span>}
                </span>
              </TableCell>
              {arrivals && (
                <TableCell className="pr-6 text-right font-mono text-sm text-muted-foreground">
                  {arrival !== undefined ? `${arrival.toFixed(2)}s` : "—"}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
