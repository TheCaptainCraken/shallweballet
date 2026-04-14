import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import { CHARACTERS } from "@/lib/characters"
import { SpinningCharacter } from "@/components/SpinningCharacter"
import type { AnimalStats } from "@/lib/api-types"

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
  const character = animal ? CHARACTERS.find((c) => c.id === animal.racer_id) : null

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-background/80">
      <div
        className={`px-3 py-2 text-center text-xs font-semibold tracking-widest uppercase ${headerClass}`}
      >
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
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <img
                src={`/character_previews/${character.id}.png`}
                alt={character.name}
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
              {character.name}
            </p>
            <p className={`text-base font-semibold ${statClass}`}>{stat}</p>
          </div>
        </>
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-foreground/40">
          No data yet
        </div>
      )}
    </div>
  )
}
