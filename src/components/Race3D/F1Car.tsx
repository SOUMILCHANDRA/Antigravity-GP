import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CarState } from '../../types/track';

interface F1CarProps {
  carState: CarState;
  isAI?: boolean;
  liveryColor?: string;
}

// Generates a soft, feathered radial shadow texture for realistic ground ambient occlusion
function createSoftShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  return new THREE.CanvasTexture(canvas);
}

// Visual McLaren GLB Model Component
// Model's front wheels are at +Z (+2.0555), rear wheels at -Z (-2.7486)
// Rotation [0, 0, 0] aligns the car nose directly with local +Z physics forward
function McLarenCarModel({ isAI = false, liveryColor = '#00E5FF' }: { isAI?: boolean; liveryColor?: string }) {
  const { scene } = useGLTF('/mclaren_mp45.glb');

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (isAI) {
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map(m => m.clone());
          } else if (mesh.material) {
            mesh.material = mesh.material.clone();
          }

          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach(mat => {
            if (mat && 'color' in mat) {
              const stdMat = mat as THREE.MeshStandardMaterial;
              if (stdMat.name === 'body_mat' || stdMat.name.includes('body')) {
                stdMat.color.set(liveryColor);
                if ('metalness' in stdMat) stdMat.metalness = 0.85;
                if ('roughness' in stdMat) stdMat.roughness = 0.25;
              }
            }
          });
        }
      }
    });
    return clone;
  }, [scene, isAI, liveryColor]);

  return (
    <primitive
      object={clonedScene}
      scale={[0.35, 0.35, 0.35]}
      rotation={[0, 0, 0]} // Aligned with +Z physics forward direction
    />
  );
}

// Fallback Procedural Car
function ProceduralCarFallback({ color = '#E10600' }: { color?: string }) {
  return (
    <mesh position={[0, 0.25, 0]} castShadow>
      <boxGeometry args={[0.8, 0.35, 3.2]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
    </mesh>
  );
}

export const F1Car: React.FC<F1CarProps> = ({ carState, isAI = false, liveryColor = '#00E5FF' }) => {
  const vehicleRootRef = useRef<THREE.Group | null>(null);
  const beaconRef = useRef<THREE.Group | null>(null);
  const shadowTexture = useMemo(() => createSoftShadowTexture(), []);

  useFrame((_, delta) => {
    if (!vehicleRootRef.current) return;

    const px = isNaN(carState.position.x) ? 0 : carState.position.x;
    const py = isNaN(carState.position.y) ? 0.05 : carState.position.y + 0.05;
    const pz = isNaN(carState.position.z) ? 0 : carState.position.z;

    const rx = isNaN(carState.rotation.x) ? 0 : carState.rotation.x;
    const ry = isNaN(carState.rotation.y) ? 0 : carState.rotation.y;
    const rz = isNaN(carState.rotation.z) ? 0 : carState.rotation.z;

    vehicleRootRef.current.position.set(px, py, pz);
    vehicleRootRef.current.rotation.set(rx, ry, rz);

    if (beaconRef.current) {
      beaconRef.current.rotation.y += delta * 2.5;
    }
  });

  return (
    <group ref={vehicleRootRef}>
      {/* Visual Car Model */}
      <Suspense fallback={<ProceduralCarFallback color={isAI ? liveryColor : '#E10600'} />}>
        <McLarenCarModel isAI={isAI} liveryColor={liveryColor} />
      </Suspense>

      {/* Floating Rival Beacon Indicator */}
      {isAI && (
        <group ref={beaconRef} position={[0, 1.45, 0]}>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial
              color={liveryColor}
              emissive={liveryColor}
              emissiveIntensity={0.9}
              roughness={0.15}
            />
          </mesh>
          <pointLight color={liveryColor} intensity={2.0} distance={5} />
        </group>
      )}

      {/* Realistic Feathered Ambient Contact Shadow */}
      <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 4.6]} />
        <meshBasicMaterial
          map={shadowTexture}
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

useGLTF.preload('/mclaren_mp45.glb');
