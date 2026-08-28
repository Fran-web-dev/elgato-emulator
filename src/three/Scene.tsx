import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { Device, Stand } from './Device'

function Rig() {
  const aspect = useThree((s) => s.size.width / s.size.height)
  const targetFov = useRef(40)
  targetFov.current = aspect < 0.75 ? 56 : aspect < 1.1 ? 48 : 40
  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera
    const diff = targetFov.current - cam.fov
    if (Math.abs(diff) > 0.01) {
      cam.fov += diff * Math.min(1, dt * 4)
      cam.updateProjectionMatrix()
    }
  })
  return null
}

export function Scene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 4.4, 7.4], fov: 40 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0, touchAction: 'none' }}
    >
      <color attach="background" args={['#0a0b10']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 7, 6]} intensity={1.4} />
      <directionalLight position={[-6, 3, -5]} intensity={0.7} color="#3b82f6" />
      <directionalLight position={[0, 2, 8]} intensity={0.5} color="#a855f7" />
      <group position={[0, 0.1, 0]}>
        <Device />
        <Stand />
      </group>
      <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={16} blur={2.6} far={4.5} />
      <OrbitControls
        makeDefault
        target={[0, 1.15, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4.5}
        maxDistance={14}
        maxPolarAngle={Math.PI / 1.9}
      />
      <Rig />
    </Canvas>
  )
}
