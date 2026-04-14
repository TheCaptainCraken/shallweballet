import { useRef } from "react"
import type { RefObject } from "react"
import { useFrame } from "@react-three/fiber"
import { RACE_LENGTH } from "./race-constants"
import type { RacerSim } from "./race-constants"

export function SimLoop({
  simRef,
  runningRef,
  finishOrderRef,
  onRaceOver,
}: Readonly<{
  simRef: RefObject<RacerSim[]>
  runningRef: RefObject<boolean>
  finishOrderRef: RefObject<string[]>
  onRaceOver: () => void
}>) {
  const firedRef = useRef(false)

  useFrame((_, dt) => {
    if (!runningRef.current) return
    const racers = simRef.current
    if (!racers) return
    for (const racer of racers) {
      if (racer.rank !== null) continue
      racer.position = Math.min(racer.position + racer.speed * dt, RACE_LENGTH)
      if (racer.position >= RACE_LENGTH) {
        racer.rank = finishOrderRef.current.indexOf(racer.id) + 1
      }
    }
    if (!firedRef.current && racers.every((r) => r.rank !== null)) {
      firedRef.current = true
      onRaceOver()
    }
  })

  return null
}
