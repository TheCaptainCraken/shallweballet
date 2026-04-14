import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js"
import { AnimationMixer, AnimationClip, Color } from "three"
import type { Group } from "three"

export function SpinningCharacter({
  modelUrl,
  animationName,
  frozen,
}: Readonly<{
  modelUrl: string
  animationName: string
  frozen: boolean
}>) {
  const { scene, animations } = useGLTF(modelUrl)
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const groupRef = useRef<Group>(null)
  const mixerRef = useRef<AnimationMixer | null>(null)
  const currentActionRef = useRef<ReturnType<AnimationMixer["clipAction"]> | null>(null)

  useEffect(() => {
    if (!animations.length) return
    const mixer = new AnimationMixer(clone)
    mixerRef.current = mixer
    const clip = AnimationClip.findByName(animations, "walk") ?? animations[0]
    const action = mixer.clipAction(clip)
    action.timeScale = 0.6
    action.play()
    currentActionRef.current = action
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(clone)
    }
  }, [clone, animations])

  useEffect(() => {
    const mixer = mixerRef.current
    if (!mixer || !animations.length) return
    const clip =
      AnimationClip.findByName(animations, animationName) ??
      AnimationClip.findByName(animations, "walk") ??
      animations[0]
    const next = mixer.clipAction(clip)
    next.timeScale = animationName === "run" ? 0.7 : 0.6
    if (currentActionRef.current && currentActionRef.current !== next) {
      currentActionRef.current.crossFadeTo(next, 0.2, true)
    }
    next.reset().play()
    currentActionRef.current = next
  }, [animationName, animations])

  useFrame((_, dt) => {
    mixerRef.current?.update(dt)
    if (!groupRef.current) return
    if (frozen) {
      const r = groupRef.current.rotation.y
      groupRef.current.rotation.y = r - Math.round(r / (Math.PI * 2)) * Math.PI * 2
      groupRef.current.rotation.y *= 0.85
    } else {
      groupRef.current.rotation.y += dt * 0.8
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={clone} position={[0, -1, 0]} rotation={[0, 0, 0]} scale={1.125} />
    </group>
  )
}

export function SceneBackground({ color }: { color: string | null }) {
  const { scene } = useThree()
  useEffect(() => {
    if (color) {
      scene.background = new Color(color)
    } else {
      scene.background = null
    }
  }, [color, scene])
  return null
}
