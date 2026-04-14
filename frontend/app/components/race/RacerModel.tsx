import { useEffect, useMemo, useRef, useState } from "react"
import type { RefObject } from "react"
import { useFrame } from "@react-three/fiber"
import { Html, useGLTF } from "@react-three/drei"
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js"
import { AnimationMixer, AnimationClip } from "three"
import type { Group } from "three"
import { type RacerSim, RACE_LENGTH, MAX_SPEED, TRACK_DISPLAY, zOf, rankText, rankTextClass } from "./race-constants"

export function RacerModel({
  id,
  modelUrl,
  name,
  index,
  n,
  simRef,
  showModal,
}: Readonly<{
  id: string
  modelUrl: string
  name: string
  index: number
  n: number
  simRef: RefObject<RacerSim[]>
  showModal: boolean
}>) {
  const { scene, animations } = useGLTF(modelUrl)
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const groupRef = useRef<Group>(null)
  const mixerRef = useRef<AnimationMixer | null>(null)
  const actionRef = useRef<ReturnType<AnimationMixer["clipAction"]> | null>(null)
  const stoppedRef = useRef(false)
  const [finishRank, setFinishRank] = useState<number | null>(null)

  useEffect(() => {
    if (!animations.length) return
    const mixer = new AnimationMixer(clone)
    mixerRef.current = mixer
    const clip = AnimationClip.findByName(animations, "run") ?? animations[0]
    const action = mixer.clipAction(clip)
    actionRef.current = action
    action.play()
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(clone)
    }
  }, [clone, animations])

  useFrame((_, dt) => {
    const racer = simRef.current?.[index]
    if (!racer) return

    if (racer.rank !== null) {
      if (!stoppedRef.current) {
        stoppedRef.current = true
        actionRef.current?.stop()
        setFinishRank(racer.rank)
      }
      return
    }

    if (actionRef.current) {
      actionRef.current.timeScale = racer.speed / MAX_SPEED
    }
    mixerRef.current?.update(dt)

    if (groupRef.current) {
      groupRef.current.position.x = (racer.position / RACE_LENGTH) * TRACK_DISPLAY
    }
  })

  const z = zOf(index, n)

  return (
    <group ref={groupRef} position={[0, 0, z] as [number, number, number]}>
      <primitive
        object={clone}
        rotation={[0, id === "animal-crab" ? 0 : Math.PI / 2, 0] as [number, number, number]}
        scale={0.5}
      />
      {finishRank !== null && !showModal && (
        <Html
          position={[0, 1.3, 0] as [number, number, number]}
          center
          distanceFactor={12}
          zIndexRange={[100, 0]}
        >
          <div
            className={`rounded-full border border-white/20 bg-background/80 px-3 py-0.5 text-[11px] font-extrabold whitespace-nowrap shadow-lg backdrop-blur-sm ${rankTextClass(finishRank)}`}
          >
            {rankText(finishRank)}
          </div>
        </Html>
      )}
    </group>
  )
}
