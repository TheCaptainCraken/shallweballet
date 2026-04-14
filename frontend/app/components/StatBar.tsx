export function StatBar({
  value,
  pct,
  valueClass,
  barClass,
}: {
  value: string
  pct: number
  valueClass: string
  barClass: string
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`font-semibold ${valueClass}`}>{value}</span>
      <div className="h-1.5 w-24 rounded-full bg-muted">
        <div className={`h-1.5 rounded-full transition-all ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
