import { Suspense } from "react"
import type { RefObject } from "react"
import { Canvas } from "@react-three/fiber"
import { type RacerSim, LANE_COLORS, LANE_GAP, TRACK_DISPLAY, zOf } from "./race-constants"
import { CameraFollow } from "./CameraFollow"
import { RacerModel } from "./RacerModel"
import { SimLoop } from "./SimLoop"
import { CheckerboardFinish } from "./CheckerboardFinish"

export function RaceScene({
  simRef,
  runningRef,
  finishOrderRef,
  onRaceOver,
  showModal,
}: Readonly<{
  simRef: RefObject<RacerSim[]>
  runningRef: RefObject<boolean>
  finishOrderRef: RefObject<string[]>
  onRaceOver: () => void
  showModal: boolean
}>) {
  const racers = simRef.current ?? []
  const n = racers.length
  const totalZ = n > 0 ? (n - 1) * LANE_GAP + LANE_GAP : LANE_GAP

  return (
    <Canvas camera={{ position: [0, 10, 15], fov: 35 }} className="size-full">
      <CameraFollow simRef={simRef} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 20, 5] as [number, number, number]} intensity={1.5} />

      {racers.map((racer, i) => (
        <mesh
          key={`lane-${racer.id}`}
          position={[TRACK_DISPLAY / 2, -0.01, zOf(i, n)] as [number, number, number]}
          rotation={[-Math.PI / 2, 0, 0] as [number, number, number]}
        >
          <planeGeometry args={[TRACK_DISPLAY, LANE_GAP * 0.95]} />
          <meshStandardMaterial
            color={LANE_COLORS[i % LANE_COLORS.length]}
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.5, 0] as [number, number, number]}>
        <boxGeometry args={[0.05, 1, totalZ]} />
        <meshStandardMaterial color="white" />
      </mesh>

      <CheckerboardFinish totalZ={totalZ} />

      <Suspense fallback={null}>
        {racers.map((racer, i) => (
          <RacerModel
            key={racer.id}
            id={racer.id}
            modelUrl={racer.modelUrl}
            name={racer.name}
            index={i}
            n={n}
            simRef={simRef}
            showModal={showModal}
          />
        ))}
      </Suspense>

      <SimLoop
        simRef={simRef}
        runningRef={runningRef}
        finishOrderRef={finishOrderRef}
        onRaceOver={onRaceOver}
      />
    </Canvas>
  )
}
