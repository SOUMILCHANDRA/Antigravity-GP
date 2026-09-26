import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CarState } from '../../types/track';
import { CAR_PRESETS, CarSpecs, DEFAULT_PLAYER_CAR_ID, DEFAULT_AI_CAR_ID } from '../../utils/carPresets';

interface F1CarProps {
  carState: CarState;
  isAI?: boolean;
  liveryColor?: string;
  isDrafting?: boolean;
  isOvertaking?: boolean;
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

// Universal GLB Car Model Renderer with dynamic AI livery tinting
function GLBCarModel({
  modelPath,
  isAI = false,
  liveryColor = '#00E5FF'
}: {
  modelPath: string;
  isAI?: boolean;
  liveryColor?: string;
}) {
  const { scene } = useGLTF(modelPath);

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
              const n = (stdMat.name || mesh.name || '').toLowerCase();
              if (
                n.includes('body') ||
                n.includes('paint') ||
                n.includes('chassis') ||
                n.includes('coloured') ||
                n.includes('meshpart1') ||
                n.includes('car_chassis') ||
                n.includes('fe0_main') ||
                n.includes('front_bumper')
              ) {
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

  return <primitive object={clonedScene} />;
}

// Fallback Procedural Car (Real proportions: 4.4m length, 2.0m width, 1.0m height)
function ProceduralCarFallback({ color = '#E10600' }: { color?: string }) {
  return (
    <mesh position={[0, 0.35, 0]} castShadow>
      <boxGeometry args={[2.0, 0.6, 4.4]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
    </mesh>
  );
}

export const F1Car: React.FC<F1CarProps> = ({
  carState,
  isAI = false,
  liveryColor,
  isDrafting = false,
  isOvertaking = false
}) => {
  // VehicleRoot is the authoritative physics object
  const vehicleRootRef = useRef<THREE.Group | null>(null);
  const beaconRef = useRef<THREE.Group | null>(null);
  const shadowTexture = useMemo(() => createSoftShadowTexture(), []);

  // Determine car specifications
  const activeCarId = carState.carId || (isAI ? DEFAULT_AI_CAR_ID : DEFAULT_PLAYER_CAR_ID);
  const specs: CarSpecs = CAR_PRESETS[activeCarId] || CAR_PRESETS[DEFAULT_PLAYER_CAR_ID];
  const effectiveLiveryColor = liveryColor || (isAI ? specs.aiDefaultColor : specs.liveryColor);

  const activeBeaconColor = (isDrafting || isOvertaking) ? '#FF9100' : effectiveLiveryColor;

  // Authoritative rendering of CarState into Three.js object (no physics writeback)
  useFrame((_, delta) => {
    if (!vehicleRootRef.current) return;

    const px = isNaN(carState.position.x) ? 0 : carState.position.x;
    const py = isNaN(carState.position.y) ? 0.1 : carState.position.y;
    const pz = isNaN(carState.position.z) ? 0 : carState.position.z;

    const rx = isNaN(carState.rotation.x) ? 0 : carState.rotation.x;
    const ry = isNaN(carState.rotation.y) ? 0 : carState.rotation.y;
    const rz = isNaN(carState.rotation.z) ? 0 : carState.rotation.z;

    vehicleRootRef.current.position.set(px, py, pz);
    vehicleRootRef.current.rotation.set(rx, ry, rz);

    if (beaconRef.current) {
      const rotSpeed = (isDrafting || isOvertaking) ? 5.5 : 2.5;
      beaconRef.current.rotation.y += delta * rotSpeed;
    }
  });

  return (
    // VehicleRoot: Controls world position, physics yaw, and motion
    <group ref={vehicleRootRef}>
      {/* CarVisual Container: Scaled and rotated to match true real-world 1:1 dimensions and face forward +Z */}
      <group
        rotation={specs.rotationOffset}
        scale={specs.scale}
        position={specs.positionOffset}
      >
        <Suspense fallback={<ProceduralCarFallback color={effectiveLiveryColor} />}>
          <GLBCarModel
            modelPath={specs.modelPath}
            isAI={isAI}
            liveryColor={effectiveLiveryColor}
          />
        </Suspense>
      </group>

      {/* Floating Rival Beacon Indicator (only rendered for AI when active) */}
      {isAI && (
        <group ref={beaconRef} position={[0, 1.85, 0]}>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <octahedronGeometry args={[isDrafting || isOvertaking ? 0.28 : 0.22, 0]} />
            <meshStandardMaterial
              color={activeBeaconColor}
              emissive={activeBeaconColor}
              emissiveIntensity={isDrafting || isOvertaking ? 1.4 : 0.9}
              roughness={0.15}
            />
          </mesh>
          <pointLight
            color={activeBeaconColor}
            intensity={isDrafting || isOvertaking ? 4.5 : 2.5}
            distance={8}
          />
        </group>
      )}

      {/* Realistic Feathered Ambient Contact Shadow scaled to full 4.5m car */}
      <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 5.8]} />
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

// Preload all 5 GLB models for instantaneous model switching
useGLTF.preload('/mclaren_mp45.glb');
useGLTF.preload('/1967_ferrari_312.glb');
useGLTF.preload('/1972_lotus_72d.glb');
useGLTF.preload('/1989_ferrari_f40_competizione.glb');
useGLTF.preload('/2014_ferrari_f1.glb');
