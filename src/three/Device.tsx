import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { useStore } from '../store'
import { Key3D } from './Key3D'

const COLS = 5
const ROWS = 3
const PITCH = 1.0

export function Device() {
  const page = useStore((s) => s.pages.find((p) => p.id === s.currentPageId) ?? s.pages[0])

  const keyPositions = useMemo(() => {
    const positions: [number, number, number][] = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = (c - (COLS - 1) / 2) * PITCH
        const y = ((ROWS - 1) / 2 - r) * PITCH
        positions.push([x, y, 0])
      }
    }
    return positions
  }, [])

  const cableCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.6, 1.75, -0.16),
        new THREE.Vector3(-0.6, 1.95, -0.5),
        new THREE.Vector3(-0.6, 1.8, -1.0),
        new THREE.Vector3(-0.6, 1.2, -1.4),
        new THREE.Vector3(-0.6, 0.1, -1.55),
      ]),
    [],
  )

  return (
    <group rotation={[-0.5, 0, 0]} position={[0, 1.5, 0]}>
      {/* body */}
      <RoundedBox args={[5.8, 3.4, 0.34]} radius={0.14} smoothness={4} castShadow>
        <meshStandardMaterial color="#1b1d24" metalness={0.65} roughness={0.38} />
      </RoundedBox>
      {/* bezel faceplate */}
      <RoundedBox args={[5.4, 3.02, 0.06]} radius={0.03} smoothness={3} position={[0, 0, 0.175]}>
        <meshStandardMaterial color="#08090c" metalness={0.3} roughness={0.7} />
      </RoundedBox>
      {/* accent strip */}
      <mesh position={[0, -1.48, 0.13]}>
        <boxGeometry args={[3.4, 0.06, 0.04]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.4} />
      </mesh>

      {/* keys */}
      {keyPositions.map((pos, i) => (
        <Key3D key={i} position={[pos[0], pos[1], 0.16]} index={i} cfg={page.keys[i] ?? null} />
      ))}

      {/* cable */}
      <mesh>
        <tubeGeometry args={[cableCurve, 32, 0.045, 8, false]} />
        <meshStandardMaterial color="#0c0d10" roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  )
}

export function Stand() {
  return (
    <group>
      {/* rear kickstand */}
      <mesh position={[0, 0.72, -1.15]} rotation={[-0.42, 0, 0]}>
        <boxGeometry args={[2.4, 1.7, 0.12]} />
        <meshStandardMaterial color="#15171d" metalness={0.6} roughness={0.45} />
      </mesh>
      {/* front feet */}
      <mesh position={[-1.6, 0.05, 0.85]}>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
        <meshStandardMaterial color="#101218" roughness={0.8} />
      </mesh>
      <mesh position={[1.6, 0.05, 0.85]}>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
        <meshStandardMaterial color="#101218" roughness={0.8} />
      </mesh>
    </group>
  )
}
