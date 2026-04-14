import type { RefObject } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { RACE_LENGTH, TRACK_DISPLAY } from "./race-constants"
import type { RacerSim } from "./race-constants"

export function CameraFollow({ simRef }: Readonly<{ simRef: RefObject<RacerSim[]> }>) {
  const { camera } = useThree()

  useFrame(() => {
    const racers = simRef.current
    if (!racers?.length) return

    const avgX =
      racers.reduce((sum, r) => sum + (r.position / RACE_LENGTH) * TRACK_DISPLAY, 0) /
      racers.length

    camera.position.x += (avgX - camera.position.x) * 0.05
    camera.lookAt(camera.position.x, 0, 0)
  })

  return null
}
