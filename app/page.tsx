'use client'

import * as THREE from 'three'
import dynamic from 'next/dynamic'
import { Suspense, useRef, useState } from 'react'
import { Canvas, extend, useThree, useFrame, MaterialNode, Object3DNode } from '@react-three/fiber'
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RapierRigidBody,
  RigidBody,
  RigidBodyProps,
  useRopeJoint,
  useSphericalJoint,
} from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import {
  Center,
  Environment,
  Lightformer,
  PerspectiveCamera,
  RenderTexture,
  Resize,
  Text3D,
  useGLTF,
} from '@react-three/drei'

extend({ MeshLineGeometry, MeshLineMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: Object3DNode<MeshLineGeometry, typeof MeshLineGeometry>
    meshLineMaterial: MaterialNode<MeshLineMaterial, typeof MeshLineMaterial>
  }
}

const Text = () => {
  return (
    <>
      <PerspectiveCamera makeDefault manual aspect={1.05} position={[0.49, 0.22, 2]} />
      <mesh>
        <planeGeometry />
        <meshBasicMaterial transparent side={THREE.BackSide} />
      </mesh>
      <Center>
        {/* <Resize maxHeight={0.45} maxWidth={0.925}>

        </Resize> */}
        <Text3D
          bevelEnabled={false}
          bevelSize={0}
          height={0}
          rotation={[0, Math.PI, Math.PI]}
          font={'/Jacquard.json'}
          size={0.3}
        >
          hjopel
        </Text3D>
      </Center>
    </>
  )
}

const Band = ({ maxSpeed = 50, minSpeed = 10 }) => {
  const band = useRef(),
    fixed = useRef<RapierRigidBody>(),
    j1 = useRef<RapierRigidBody>(),
    j2 = useRef<RapierRigidBody>(),
    j3 = useRef<RapierRigidBody>(),
    card = useRef<RapierRigidBody>()

  const { nodes, materials } = useGLTF(
    'https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/5huRVDzcoDwnbgrKUo1Lzs/53b6dd7d6b4ffcdbd338fa60265949e1/tag.glb',
  )

  const { width, height } = useThree((state) => state.size)

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
  )

  const vec = new THREE.Vector3()
  const ang = new THREE.Vector3()
  const rot = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const [dragged, drag] = useState<THREE.Vector3 | false>()
  const segmentProps = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: 2,
    linearDamping: 2,
  } as RigidBodyProps

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.45, 0],
  ])

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp())
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z })
    }

    if (fixed.current) {
      curve.points[0].copy(j3.current.translation())
      curve.points[1].copy(j2.current.translation())
      curve.points[2].copy(j1.current.translation())
      curve.points[3].copy(fixed.current.translation())
      band.current.geometry.setPoints(curve.getPoints(32))

      // Tilt the card back towards the screen
      ang.copy(card.current.angvel())
      rot.copy(card.current.rotation())
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z })
    }
  })
  curve.curveType = 'chordal'

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} type='fixed' />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            onPointerUp={(e) => drag(false)}
            onPointerDown={(e) => drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))}
          >
            {/* <planeGeometry args={[0.8 * 2, 1.125 * 2]} />
            <meshBasicMaterial color='white' side={THREE.DoubleSide} /> */}
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                clearcoat={1}
                clearcoatRoughness={0.15}
                iridescence={1}
                iridescenceIOR={1}
                iridescenceThicknessRange={[0, 2400]}
                metalness={0.5}
                roughness={0.3}
              >
                <RenderTexture attach={'map'} height={2000} width={2000}>
                  <Text />
                </RenderTexture>
              </meshPhysicalMaterial>
            </mesh>
            {/* <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} /> */}
          </group>
        </RigidBody>
      </group>

      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial color='white' resolution={[width, height]} lineWidth={1} />
      </mesh>
    </>
  )
}
export default function Page() {
  return (
    <>
      <Canvas camera={{ position: [0, 0, 6], fov: 25 }}>
        <ambientLight intensity={Math.PI} />

        <Physics interpolate gravity={[0, -40, 0]} timeStep={1 / 60}>
          <Band />
        </Physics>

        <Environment background blur={0.75}>
          <color attach='background' args={['black']} />
          <Lightformer
            intensity={2}
            color='white'
            position={[0, -1, 5]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color='white'
            position={[-1, -1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color='white'
            position={[1, 1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={10}
            color='white'
            position={[-10, 0, 14]}
            rotation={[0, Math.PI / 2, Math.PI / 3]}
            scale={[100, 10, 1]}
          />
        </Environment>
      </Canvas>
    </>
  )
}
