import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SplinePoint } from '../../types/track';
import { generateIdealRacingLine } from '../../utils/racingLine';

interface IdealRacingLineProps {
  splinePoints: SplinePoint[];
  visible?: boolean;
}

export const IdealRacingLine: React.FC<IdealRacingLineProps> = ({
  splinePoints,
  visible = true
}) => {
  const geometry = useMemo(() => {
    if (!visible || splinePoints.length < 4) return null;

    const racingPoints = generateIdealRacingLine(splinePoints);
    const n = racingPoints.length;
    if (n < 4) return null;

    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const ribbonHalfWidth = 0.35; // 0.7m total width ribbon

    for (let i = 0; i < n; i++) {
      const p = racingPoints[i];
      const nextP = racingPoints[(i + 1) % n];

      // Local tangent vector
      const tx = nextP.position.x - p.position.x;
      const tz = nextP.position.z - p.position.z;
      const len = Math.hypot(tx, tz) || 1;
      const normTx = tx / len;
      const normTz = tz / len;

      // Normal to tangent in X-Z plane: (-Tz, 0, Tx)
      const nx = -normTz;
      const nz = normTx;

      // Left and right edges
      const lx = p.position.x - nx * ribbonHalfWidth;
      const ly = p.position.y;
      const lz = p.position.z - nz * ribbonHalfWidth;

      const rx = p.position.x + nx * ribbonHalfWidth;
      const ry = p.position.y;
      const rz = p.position.z + nz * ribbonHalfWidth;

      vertices.push(lx, ly, lz);
      vertices.push(rx, ry, rz);

      // Vertex colors
      colors.push(p.color[0], p.color[1], p.color[2]);
      colors.push(p.color[0], p.color[1], p.color[2]);

      // Triangles connecting current segment to next segment
      const currentLeft = i * 2;
      const currentRight = i * 2 + 1;
      const nextLeft = ((i + 1) % n) * 2;
      const nextRight = ((i + 1) % n) * 2 + 1;

      // Triangle 1: currentLeft, currentRight, nextLeft
      indices.push(currentLeft, currentRight, nextLeft);
      // Triangle 2: nextLeft, currentRight, nextRight
      indices.push(nextLeft, currentRight, nextRight);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return geom;
  }, [splinePoints, visible]);

  if (!visible || !geometry) return null;

  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.85}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
