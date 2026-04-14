import { useMemo } from "react"
import { DataTexture, RGBAFormat, NearestFilter, RepeatWrapping } from "three"
import { TRACK_DISPLAY } from "./race-constants"

export function CheckerboardFinish({ totalZ }: Readonly<{ totalZ: number }>) {
  const checkerTex = useMemo(() => {
    const size = 4
    const data = new Uint8Array(size * size * 4)
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const isWhite = (row + col) % 2 === 0
        const v = isWhite ? 255 : 0
        const idx = (row * size + col) * 4
        data[idx] = v
        data[idx + 1] = v
        data[idx + 2] = v
        data[idx + 3] = 255
      }
    }
    const tex = new DataTexture(data, size, size, RGBAFormat)
    tex.magFilter = NearestFilter
    tex.minFilter = NearestFilter
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(2, totalZ / 2)
    tex.needsUpdate = true
    return tex
  }, [totalZ])

  return (
    <mesh position={[TRACK_DISPLAY, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4, totalZ]} />
      <meshStandardMaterial map={checkerTex} />
    </mesh>
  )
}
