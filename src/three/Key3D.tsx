import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store'
import type { KeyConfig } from '../types'
import { drawKey } from './keyTexture'
interface Props {
  position: [number, number, number]
  index: number
  cfg: KeyConfig | null
}

export function Key3D({ position, index, cfg }: Props) {
  const editMode = useStore((s) => s.editMode)
  const runtime = useStore((s) => (cfg ? s.runtime[cfg.id] : undefined))
  const obsStatus = useStore((s) => s.obsStatus)
  const press = useStore((s) => s.press)
  const select = useStore((s) => s.select)
  const addKey = useStore((s) => s.addKey)
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null

  const [pressed, setPressed] = useState(false)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const downRef = useRef(false)
  const bodyRef = useRef<THREE.Group>(null)

  const iconImage = cfg?.iconImage
  useEffect(() => {
    setImg(null)
    if (!iconImage) return
    const im = new Image()
    im.onload = () => setImg(im)
    im.src = iconImage
  }, [iconImage])

  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    return { canvas, texture }
  }, [])

  useEffect(() => {
    const active =
      !!cfg &&
      ((cfg.action.kind === 'obs-stream' && obsStatus.streaming) ||
        (cfg.action.kind === 'obs-record' && obsStatus.recording) ||
        (cfg.action.kind === 'obs-mute' && obsStatus.muted.includes(cfg.action.source || 'Mic/Aux')) ||
        (cfg.action.kind === 'obs-scene' && obsStatus.scene === cfg.action.scene))
    drawKey(canvas, cfg, runtime, {
      ghost: !cfg,
      active,
      editMode,
      pressed,
    }, img)
    texture.needsUpdate = true
  }, [canvas, texture, cfg, runtime, obsStatus, editMode, pressed, img])

  useFrame((_, dt) => {
    if (bodyRef.current) {
      const target = pressed ? -0.035 : 0
      bodyRef.current.position.z += (target - bodyRef.current.position.z) * Math.min(1, dt * 22)
    }
  })

  useEffect(() => {
    const release = () => {
      downRef.current = false
      setPressed(false)
      if (controls) controls.enabled = true
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
  }, [controls])

  const isGhost = !cfg
  const interactive = editMode || !isGhost

  const handleDown = (e: { stopPropagation: () => void }) => {
    if (!interactive) return
    e.stopPropagation()
    downRef.current = true
    setPressed(true)
    if (controls) controls.enabled = false
  }

  const handleUp = (e: { stopPropagation: () => void }) => {
    if (!downRef.current) return
    e.stopPropagation()
    downRef.current = false
    setPressed(false)
    if (controls) controls.enabled = true
    if (editMode) {
      if (isGhost && index >= 0) addKey(index)
      else if (cfg) select(cfg.id)
    } else if (cfg) {
      press(cfg.id)
    }
  }

  return (
    <group position={position}>
      <group
        ref={bodyRef}
        onPointerDown={interactive ? handleDown : undefined}
        onPointerUp={interactive ? handleUp : undefined}
      >
        <RoundedBox args={[0.92, 0.92, 0.09]} radius={0.028} smoothness={3}>
          <meshStandardMaterial
            color={isGhost ? '#171a21' : '#0f1116'}
            metalness={0.4}
            roughness={0.55}
          />
        </RoundedBox>
        <mesh position={[0, 0, 0.052]}>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial map={texture} toneMapped={false} transparent />
        </mesh>
      </group>
    </group>
  )
}
