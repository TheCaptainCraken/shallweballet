import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function StreakBadge({ winStreak, lossStreak }: { winStreak: number; lossStreak: number }) {
  return (
    <span className="inline-flex gap-1">
      {winStreak > 5 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">🔥</span>
          </TooltipTrigger>
          <TooltipContent>Win streak: {winStreak} in a row</TooltipContent>
        </Tooltip>
      )}
      {lossStreak > 2 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default">💀</span>
          </TooltipTrigger>
          <TooltipContent>Loss streak: {lossStreak} in a row</TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}
