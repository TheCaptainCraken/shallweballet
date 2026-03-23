import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import { SpinningCharacter } from "@/components/CharacterCard"
import { CHARACTERS } from "@/lib/characters"

export interface AnimalStats {
  racer_id: string
  total_races: number
  wins: number
  losses: number
  win_rate: number
  win_streak: number
  loss_streak: number
  current_win_streak: number
  current_loss_streak: number
}

function getCharacter(racerId: string) {
  return CHARACTERS.find((c) => c.id === racerId)
}

export function HeroCard({
  label,
  animal,
  stat,
  headerClass,
  statClass,
}: {
  label: string
  animal: AnimalStats | null
  stat: string
  headerClass: string
  statClass: string
}) {
  const character = animal ? getCharacter(animal.racer_id) : null
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-background/80">
      <div className={`px-3 py-2 text-center text-xs font-semibold tracking-widest uppercase ${headerClass}`}>
        {label}
      </div>
      {character && animal ? (
        <>
          <div className="h-40 w-full bg-foreground/5">
            <Canvas camera={{ position: [0, 0, 3.5], fov: 55 }}>
              <ambientLight intensity={1.2} />
              <directionalLight position={[5, 10, 5]} intensity={1.5} />
              <Suspense fallback={null}>
                <SpinningCharacter modelUrl={character.modelUrl} animationName="walk" frozen={false} />
              </Suspense>
            </Canvas>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 text-center">
            <p className="text-sm font-bold">{character.name}</p>
            <p className={`text-base font-semibold ${statClass}`}>{stat}</p>
          </div>
        </>
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-foreground/40">No data yet</div>
      )}
    </div>
  )
}
