import { Canvas } from "@react-three/fiber"
import { Suspense, useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { CharacterData } from "@/lib/characters"
import { LANE_COLORS } from "@/components/race/race-constants"
import { SpinningCharacter, SceneBackground } from "@/components/SpinningCharacter"
import { StreakBadge } from "@/components/StreakBadge"

export type { CharacterData } from "@/lib/characters"
export { StreakBadge } from "@/components/StreakBadge"
export { SpinningCharacter } from "@/components/SpinningCharacter"

interface CharacterCardProps {
  character: CharacterData
  selectedNumber: number | null
  onToggle: () => void
  disabled?: boolean
  winStreak?: number
  lossStreak?: number
}

export function CharacterCard({
  character,
  selectedNumber,
  onToggle,
  disabled = false,
  winStreak = 0,
  lossStreak = 0,
}: Readonly<CharacterCardProps>) {
  const isSelected = selectedNumber !== null
  const [isHovered, setIsHovered] = useState(false)
  const showModel = isHovered || isSelected
  const animationName = isSelected || isHovered ? "run" : "walk"

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      className={cn(
        "relative flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-background/80 text-left backdrop-blur-sm transition-all hover:bg-background/90",
        isSelected ? "" : "border-border/50 hover:border-border",
        disabled && "cursor-not-allowed opacity-40",
      )}
      style={
        isSelected
          ? {
              borderColor: LANE_COLORS[(selectedNumber - 1) % 10],
              boxShadow: `0 0 0 2px ${LANE_COLORS[(selectedNumber - 1) % 10]}`,
            }
          : undefined
      }
    >
      {isSelected && (
        <Badge
          className="absolute top-2 right-2 z-10 font-bold"
          style={{ backgroundColor: LANE_COLORS[(selectedNumber - 1) % 10], color: "#fff" }}
        >
          Lane {selectedNumber}
        </Badge>
      )}
      <div
        style={{ height: 240 }}
        className="flex w-full items-center justify-center overflow-hidden bg-foreground/5"
      >
        {showModel ? (
          <Canvas camera={{ position: [0, 0, 3.5], fov: 55 }}>
            <SceneBackground
              color={
                isSelected && selectedNumber !== null
                  ? LANE_COLORS[(selectedNumber - 1) % 10]
                  : null
              }
            />
            <ambientLight intensity={1.2} />
            <directionalLight position={[5, 10, 5]} intensity={1.5} />
            <Suspense fallback={null}>
              <SpinningCharacter
                modelUrl={character.modelUrl}
                animationName={animationName}
                frozen={isHovered || isSelected}
              />
            </Suspense>
          </Canvas>
        ) : (
          <img
            src={`/character_previews/${character.id}.png`}
            alt={character.name}
            className="h-full w-full object-contain"
          />
        )}
      </div>
      <div className="flex items-center gap-1.5 p-3">
        <p className="truncate text-sm font-bold leading-tight">{character.name}</p>
        <TooltipProvider>
          <StreakBadge winStreak={winStreak} lossStreak={lossStreak} />
        </TooltipProvider>
      </div>
    </button>
  )
}
