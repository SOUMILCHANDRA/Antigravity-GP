import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { SplinePoint } from '../../types/track';

interface TunnelLightingProps {
  splinePoints: SplinePoint[];
}

export const TunnelLighting: React.FC<TunnelLightingProps> = React.memo(({ splinePoints }) => {
  const { panels, lightPositions } = useMemo(() => {
    const vertices: number[] = [];
    const positions: [number, number, number][] = [];
    const stride = 3;

    for (let index = 0; index < splinePoints.length; index += stride) {
      const point = splinePoints[index];
      if (!point.tunnel || !splinePoints[index + 1]?.tunnel) continue;

      const panelCenter = {
        x: point.position.x + point.normal.x * 4.0,
        y: point.position.y + point.normal.y * 4.0,
        z: point.position.z + point.normal.z * 4.0
      };
      const halfWidth = Math.min(4.8, point.width * 0.34);
      const halfLength = 0.7;
      const corners = [
        [-halfWidth, -halfLength], [halfWidth, -halfLength],
        [halfWidth, halfLength], [-halfWidth, halfLength]
      ] as const;
      const quad = corners.map(([across, along]) => [
        panelCenter.x + point.binormal.x * across + point.tangent.x * along,
        panelCenter.y + point.binormal.y * across + point.tangent.y * along,
        panelCenter.z + point.binormal.z * across + point.tangent.z * along
      ]);
      vertices.push(...quad[0], ...quad[1], ...quad[2], ...quad[0], ...quad[2], ...quad[3]);

      if (index % (stride * 2) === 0 && positions.length < 24) {
        positions.push([
          point.position.x + point.normal.x * 3.0,
          point.position.y + point.normal.y * 3.0,
          point.position.z + point.normal.z * 3.0
        ]);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return { panels: vertices.length ? geometry : null, lightPositions: positions };
  }, [splinePoints]);

  useEffect(() => () => panels?.dispose(), [panels]);

  if (!panels) return null;

  return (
    <group name="automatic-tunnel-lighting">
      <mesh geometry={panels}>
        <meshStandardMaterial color="#fff2cf" emissive="#ffd88a" emissiveIntensity={3.5} roughness={0.32} side={THREE.DoubleSide} />
      </mesh>
      {lightPositions.map((position, index) => (
        <pointLight key={index} position={position} color="#ffdfaa" intensity={4.5} distance={38} decay={2} />
      ))}
    </group>
  );
});
