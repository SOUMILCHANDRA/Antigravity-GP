import React, { useRef, useEffect } from 'react';
import { SplinePoint, Vector3D } from '../../types/track';

interface MinimapProps {
  splinePoints: SplinePoint[];
  carPosition: Vector3D;
  carRotationY: number;
  aiPosition?: Vector3D | null;
  aiRotationY?: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  splinePoints,
  carPosition,
  carRotationY,
  aiPosition,
  aiRotationY
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || splinePoints.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    splinePoints.forEach(p => {
      if (p.position.x < minX) minX = p.position.x;
      if (p.position.x > maxX) maxX = p.position.x;
      if (p.position.z < minZ) minZ = p.position.z;
      if (p.position.z > maxZ) maxZ = p.position.z;
    });

    const trackW = maxX - minX || 1;
    const trackH = maxZ - minZ || 1;

    const margin = 16;
    const scaleX = (canvas.width - margin * 2) / trackW;
    const scaleZ = (canvas.height - margin * 2) / trackH;
    const scale = Math.min(scaleX, scaleZ);

    const worldToMinimap = (wx: number, wz: number) => {
      const x = margin + (wx - minX) * scale;
      const y = margin + (wz - minZ) * scale;
      return { x, y };
    };

    // Draw Track Path
    ctx.beginPath();
    splinePoints.forEach((p, idx) => {
      const mPos = worldToMinimap(p.position.x, p.position.z);
      if (idx === 0) ctx.moveTo(mPos.x, mPos.y);
      else ctx.lineTo(mPos.x, mPos.y);
    });
    ctx.closePath();
    ctx.strokeStyle = '#1E2638';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // AI Competitor Dot (Cyan)
    if (aiPosition) {
      const aiM = worldToMinimap(aiPosition.x, aiPosition.z);
      ctx.beginPath();
      ctx.arc(aiM.x, aiM.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00E5FF';
      ctx.fill();

      if (aiRotationY !== undefined) {
        const ax = aiM.x + Math.sin(aiRotationY) * 6;
        const ay = aiM.y + Math.cos(aiRotationY) * 6;
        ctx.beginPath();
        ctx.moveTo(aiM.x, aiM.y);
        ctx.lineTo(ax, ay);
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Player Car Dot Marker (Red)
    const carM = worldToMinimap(carPosition.x, carPosition.z);

    ctx.beginPath();
    ctx.arc(carM.x, carM.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#E10600';
    ctx.fill();

    // Heading direction
    const arrLen = 7;
    const ax = carM.x + Math.sin(carRotationY) * arrLen;
    const ay = carM.y + Math.cos(carRotationY) * arrLen;

    ctx.beginPath();
    ctx.moveTo(carM.x, carM.y);
    ctx.lineTo(ax, ay);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.8;
    ctx.stroke();

  }, [splinePoints, carPosition, carRotationY, aiPosition, aiRotationY]);

  return (
    <div className="absolute top-20 right-6 bg-[#0E131F]/90 backdrop-blur-md border border-[#1E2638] rounded-2xl p-3 shadow-xl z-30 select-none">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
          CIRCUIT MAP
        </span>
        {aiPosition && (
          <div className="flex items-center gap-2 text-[9px] font-mono">
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E10600]"></span> YOU
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]"></span> AI
            </span>
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={140}
        height={140}
        className="block bg-[#0B0E14] rounded-xl border border-[#161D2B]"
      />
    </div>
  );
};
