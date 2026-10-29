import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { VenueFacility, SplinePoint, PitLaneConfig } from '../../types/track';

interface VenueFacilitiesProps {
  facilities?: VenueFacility[];
  splinePoints: SplinePoint[];
  pitLane?: PitLaneConfig;
  trackName?: string;
  sponsorName?: string;
}

export const VenueFacilities: React.FC<VenueFacilitiesProps> = React.memo(({ facilities = [], splinePoints, pitLane, trackName, sponsorName }) => {
  if (splinePoints.length < 2) return null;

  const totalLength = splinePoints[splinePoints.length - 1].distance;
  const explicitTypes = new Set(facilities.map((facility) => facility.type));
  const generated: VenueFacility[] = [];
  const anchoredFacility = (id: string, type: VenueFacility['type'], splineT: number, side: 'left' | 'right', scaleX: number, label?: string): VenueFacility => ({
    id,
    type,
    splineT,
    side,
    label,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: scaleX, y: 1, z: 1 }
  });

  // Auto-build a light-touch venue on new circuits; manually placed facilities replace their generated category.
  if (!explicitTypes.has('grandstand')) generated.push(anchoredFacility('auto-grandstand', 'grandstand', 0.025, 'left', 12));
  if (pitLane?.enabled && !explicitTypes.has('pit_building')) {
    const pitT = pitLane.entryT > pitLane.exitT ? pitLane.entryT + (1 - pitLane.entryT + pitLane.exitT) / 2 : (pitLane.entryT + pitLane.exitT) / 2;
    generated.push(anchoredFacility('auto-pit-building', 'pit_building', pitT % 1, pitLane.side, (pitLane.width || 7.5) + 14));
  }
  if (!explicitTypes.has('sponsor_board') && totalLength > 0) {
    const boardCount = Math.min(20, Math.max(4, Math.floor(totalLength / 450)));
    for (let index = 0; index < boardCount; index++) {
      generated.push(anchoredFacility(
        `auto-sponsor-${index}`,
        'sponsor_board',
        (index + 0.35) / boardCount,
        index % 2 === 0 ? 'left' : 'right',
        9,
        sponsorName || trackName || 'ANTIGRAVITY GP'
      ));
    }
  }
  if (!explicitTypes.has('marshal_post') && totalLength > 0) {
    const marshalCount = Math.min(10, Math.max(4, Math.floor(totalLength / 900)));
    for (let index = 0; index < marshalCount; index++) {
      generated.push(anchoredFacility(`auto-marshal-${index}`, 'marshal_post', (index + 0.5) / marshalCount, index % 2 === 0 ? 'right' : 'left', 2));
    }
  }

  const visibleFacilities = [...facilities, ...generated];
  if (visibleFacilities.length === 0) return null;

  return (
    <group name="venue-facilities">
      {visibleFacilities.map((fac) => {
        // Calculate world position if anchored to splineT
        let posX = fac.position.x;
        let posY = fac.position.y;
        let posZ = fac.position.z;
        let rotY = fac.rotation.y;

        if (fac.splineT !== undefined) {
          const clampedT = Math.max(0, Math.min(1, fac.splineT));
          const splineIdx = Math.floor(clampedT * (splinePoints.length - 1));
          const p = splinePoints[splineIdx] || splinePoints[0];
          const halfW = p.width / 2;
          const offsetDist = fac.side === 'left' ? -(halfW + (fac.scale.x || 12)) : (halfW + (fac.scale.x || 12));

          posX = p.position.x + p.binormal.x * offsetDist;
          posY = p.position.y;
          posZ = p.position.z + p.binormal.z * offsetDist;
          rotY = Math.atan2(p.tangent.x, p.tangent.z) + (fac.side === 'left' ? Math.PI / 2 : -Math.PI / 2);
        }

        switch (fac.type) {
          case 'grandstand':
            return (
              <GrandstandMesh
                key={fac.id}
                position={[posX, posY, posZ]}
                rotation={[0, rotY, 0]}
                seats={fac.seats || 500}
              />
            );
          case 'pit_building':
            return (
              <PitBuildingMesh
                key={fac.id}
                position={[posX, posY, posZ]}
                rotation={[0, rotY, 0]}
              />
            );
          case 'tire_barrier':
            return (
              <TireBarrierMesh
                key={fac.id}
                position={[posX, posY, posZ]}
                rotation={[0, rotY, 0]}
              />
            );
          case 'sponsor_board':
            return (
              <SponsorBoardMesh
                key={fac.id}
                position={[posX, posY, posZ]}
                rotation={[0, rotY, 0]}
                label={fac.label || 'ANTIGRAVITY'}
              />
            );
          case 'gantry':
            return (
              <StartGantryMesh
                key={fac.id}
                position={[posX, posY, posZ]}
                rotation={[0, rotY, 0]}
              />
            );
          case 'marshal_post':
            return (
              <MarshalPostMesh
                key={fac.id}
                position={[posX, posY, posZ]}
                rotation={[0, rotY, 0]}
              />
            );
          default:
            return null;
        }
      })}
    </group>
  );
});

// 1. Multi-tier Covered Grandstand
const GrandstandMesh: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; seats: number }> = ({
  position,
  rotation,
  seats
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Concrete Base Steps */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[24, 3, 10]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Seating Tiers (Red & White F1 Seats) */}
      <mesh position={[0, 3.2, -1]} castShadow>
        <boxGeometry args={[22, 1.2, 7]} />
        <meshStandardMaterial color="#E10600" roughness={0.6} />
      </mesh>

      {/* Canopy Steel Support Pillars */}
      <mesh position={[-11, 4.5, 4]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 9, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} />
      </mesh>
      <mesh position={[11, 4.5, 4]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 9, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} />
      </mesh>
      <mesh position={[-11, 6.5, -4]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 13, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} />
      </mesh>
      <mesh position={[11, 6.5, -4]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 13, 8]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} />
      </mesh>

      {/* Slanted Aerodynamic Canopy Roof */}
      <mesh position={[0, 9.5, 0]} rotation={[0.2, 0, 0]} castShadow>
        <boxGeometry args={[25, 0.4, 12]} />
        <meshStandardMaterial color="#1E293B" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Sponsor Banner on Roof Fascia */}
      <mesh position={[0, 9.8, 5.8]}>
        <boxGeometry args={[24, 1.0, 0.2]} />
        <meshStandardMaterial color="#0284C7" />
      </mesh>
    </group>
  );
};

// 2. Modern 2-Story Pit Garage & Team Hospitality Building
const PitBuildingMesh: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({
  position,
  rotation
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Ground Floor Team Garages */}
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[45, 5, 12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.7} />
      </mesh>

      {/* Garage Bay Openings */}
      {[-16, -8, 0, 8, 16].map((gx, idx) => (
        <mesh key={idx} position={[gx, 1.8, 6.05]}>
          <boxGeometry args={[6, 3.6, 0.2]} />
          <meshStandardMaterial color="#0F172A" metalness={0.6} />
        </mesh>
      ))}

      {/* 2nd Floor VIP Glass Hospitality Lounge */}
      <mesh position={[0, 6.5, 0]} castShadow>
        <boxGeometry args={[44, 3, 11]} />
        <meshStandardMaterial color="#38BDF8" transparent opacity={0.75} roughness={0.1} metalness={0.9} />
      </mesh>

      {/* Rooftop Podium & VIP Terrace */}
      <mesh position={[0, 8.2, 0]}>
        <boxGeometry args={[45, 0.4, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>

      {/* Pit Building Gantry Wall with Sponsor Strip */}
      <mesh position={[0, 8.8, 5.8]}>
        <boxGeometry args={[44, 0.8, 0.2]} />
        <meshStandardMaterial color="#E10600" />
      </mesh>
    </group>
  );
};

// 3. Four-Row Rubber Tire Safety Barrier
const TireBarrierMesh: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({
  position,
  rotation
}) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 1.2, 1.8]} />
        <meshStandardMaterial color="#18181B" roughness={0.95} />
      </mesh>
      {/* White protective canvas wrapping on top */}
      <mesh position={[0, 1.22, 0]}>
        <boxGeometry args={[13.8, 0.1, 1.7]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.5} />
      </mesh>
    </group>
  );
};

// 4. Trackside Sponsor Board
const SponsorBoardMesh: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; label: string }> = ({ position, rotation, label }) => {
  const boardTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#dc2626';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.font = '800 76px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label.toUpperCase(), canvas.width / 2, canvas.height / 2, canvas.width - 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [label]);
  useEffect(() => () => boardTexture?.dispose(), [boardTexture]);

  return (
    <group position={position} rotation={rotation}>
      {/* Slanted A-Frame Board */}
      <mesh position={[0, 0.7, 0]} rotation={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[8, 1.4, 0.15]} />
        <meshStandardMaterial color="#E10600" metalness={0.2} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.7, 0.085]} rotation={[-0.2, 0, 0]}>
        <planeGeometry args={[7.8, 1.25]} />
        <meshStandardMaterial map={boardTexture} color={boardTexture ? '#ffffff' : '#dc2626'} roughness={0.55} />
      </mesh>
      {/* Support Legs */}
      <mesh position={[-3.5, 0.3, -0.4]}>
        <boxGeometry args={[0.1, 0.8, 0.8]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[3.5, 0.3, -0.4]}>
        <boxGeometry args={[0.1, 0.8, 0.8]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
    </group>
  );
};

// 5. Start / Finish Digital Light Gantry
const StartGantryMesh: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({
  position,
  rotation
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Left Tower */}
      <mesh position={[-9, 4.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 9, 12]} />
        <meshStandardMaterial color="#1E293B" metalness={0.8} />
      </mesh>
      {/* Right Tower */}
      <mesh position={[9, 4.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 9, 12]} />
        <meshStandardMaterial color="#1E293B" metalness={0.8} />
      </mesh>
      {/* Overhead Truss */}
      <mesh position={[0, 8.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 18.6, 12]} />
        <meshStandardMaterial color="#E10600" metalness={0.6} />
      </mesh>
      {/* 5 F1 Start Lights */}
      {[-2, -1, 0, 1, 2].map((lx, idx) => (
        <mesh key={idx} position={[lx, 7.8, 0]}>
          <boxGeometry args={[0.5, 0.8, 0.3]} />
          <meshStandardMaterial color="#0F172A" />
        </mesh>
      ))}
    </group>
  );
};

// 6. Trackside Safety Marshal Hut
const MarshalPostMesh: React.FC<{ position: [number, number, number]; rotation: [number, number, number] }> = ({
  position,
  rotation
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Post Platform */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 2.4, 3]} />
        <meshStandardMaterial color="#E10600" roughness={0.7} />
      </mesh>
      {/* Orange/Yellow Safety Flag Roof */}
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[3.4, 0.3, 3.4]} />
        <meshStandardMaterial color="#F59E0B" roughness={0.5} />
      </mesh>
    </group>
  );
};
