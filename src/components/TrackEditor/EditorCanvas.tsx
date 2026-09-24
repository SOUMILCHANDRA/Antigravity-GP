import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TrackNode, TrackConfig } from '../../types/track';
import { buildTrackCurve, sampleSplinePoints } from '../../utils/spline';
import { Plus } from 'lucide-react';

interface EditorCanvasProps {
  track: TrackConfig;
  setTrack: React.Dispatch<React.SetStateAction<TrackConfig>>;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  onAddPoint: (point: { x: number; y: number }) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  track,
  setTrack,
  selectedNodeId,
  setSelectedNodeId,
  onAddPoint
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport transformation (Pan & Zoom)
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);

  // Mouse interaction state
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [mouseWorld, setMouseWorld] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: window.innerWidth,
    height: window.innerHeight - 64
  });

  // Keep internal canvas dimensions synchronized with window/container layout
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight - 64
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Unified Precise Screen-to-World Coordinate Conversion
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Scale ratios between actual internal drawing pixels & CSS layout pixels
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);

    // Canvas internal pixel coordinates
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    // Apply inverse editor camera pan/zoom transform (centered origin)
    const worldX = (canvasX - canvas.width / 2 - offset.x) / zoom;
    const worldY = (canvasY - canvas.height / 2 - offset.y) / zoom;

    return { x: worldX, y: worldY };
  }, [offset, zoom]);

  // 2. Unified Precise World-to-Canvas Coordinate Conversion
  const worldToCanvas = useCallback((wx: number, wy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const cx = canvas.width / 2 + offset.x + wx * zoom;
    const cy = canvas.height / 2 + offset.y + wy * zoom;
    return { x: cx, y: cy };
  }, [offset, zoom]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Dark Motorsport Technical Grid
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gridSizeMeters = 40;
    const gridPixelSize = gridSizeMeters * zoom;
    const startX = (offset.x + canvas.width / 2) % gridPixelSize;
    const startY = (offset.y + canvas.height / 2) % gridPixelSize;

    ctx.strokeStyle = '#141A26';
    ctx.lineWidth = 1;
    for (let x = startX; x < canvas.width; x += gridPixelSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = startY; y < canvas.height; y += gridPixelSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Origin Center Axes
    const origin = worldToCanvas(0, 0);
    ctx.strokeStyle = '#1E2B42';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(canvas.width, origin.y);
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, canvas.height);
    ctx.stroke();

    // 2. Draw Track Spline preview or asphalt surface if closed
    if (track.nodes.length >= 2) {
      const curve = buildTrackCurve(track.nodes, track.isClosed);
      const samples = sampleSplinePoints(curve, track.nodes, 350);

      if (track.isClosed && samples.length > 0) {
        // Draw Outer Runoff/Grass Boundary
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        samples.forEach((p, idx) => {
          const sp = worldToCanvas(p.position.x, p.position.z);
          if (idx === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.strokeStyle = '#222B3D';
        ctx.lineWidth = (track.defaultWidth + 10) * zoom;
        ctx.stroke();

        // Draw Red/White Kerb Edge Lines
        ctx.beginPath();
        samples.forEach((p, idx) => {
          const sp = worldToCanvas(p.position.x, p.position.z);
          if (idx === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.strokeStyle = '#E10600';
        ctx.lineWidth = (track.defaultWidth + 3.5) * zoom;
        ctx.stroke();

        // Main Charcoal Asphalt Road Surface
        ctx.beginPath();
        samples.forEach((p, idx) => {
          const sp = worldToCanvas(p.position.x, p.position.z);
          if (idx === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.strokeStyle = '#1C2129';
        ctx.lineWidth = track.defaultWidth * zoom;
        ctx.stroke();

        // Center dash line
        ctx.setLineDash([10 * zoom, 10 * zoom]);
        ctx.beginPath();
        samples.forEach((p, idx) => {
          const sp = worldToCanvas(p.position.x, p.position.z);
          if (idx === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        // Start / Finish Line Banner
        const startP = samples[0];
        if (startP) {
          const sPos = worldToCanvas(startP.position.x, startP.position.z);
          ctx.beginPath();
          ctx.arc(sPos.x, sPos.y, 9, 0, Math.PI * 2);
          ctx.fillStyle = '#00FF66';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else {
        // Draw Open Spline Curve Line
        ctx.beginPath();
        samples.forEach((p, idx) => {
          const sp = worldToCanvas(p.position.x, p.position.z);
          if (idx === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.strokeStyle = '#E10600';
        ctx.lineWidth = 4 * zoom;
        ctx.stroke();

        // Dashed Preview Segment to Cursor from Last Point
        const lastNode = track.nodes[track.nodes.length - 1];
        if (lastNode && !track.isClosed) {
          const lastScreen = worldToCanvas(lastNode.x, lastNode.y);
          const cursorScreen = worldToCanvas(mouseWorld.x, mouseWorld.y);
          ctx.setLineDash([6 * zoom, 6 * zoom]);
          ctx.beginPath();
          ctx.moveTo(lastScreen.x, lastScreen.y);
          ctx.lineTo(cursorScreen.x, cursorScreen.y);
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // 3. Draw Nodes (Control Points)
    track.nodes.forEach((node, idx) => {
      const sp = worldToCanvas(node.x, node.y);
      const isSelected = node.id === selectedNodeId;
      const isFirst = idx === 0;

      // Selection Ring
      if (isSelected || (isFirst && !track.isClosed && track.nodes.length >= 3)) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = isFirst ? 'rgba(0, 255, 102, 0.25)' : 'rgba(225, 6, 0, 0.25)';
        ctx.fill();
        ctx.strokeStyle = isFirst ? '#00FF66' : '#E10600';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Node Body
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = isFirst ? '#00FF66' : isSelected ? '#E10600' : '#121721';
      ctx.fill();
      ctx.strokeStyle = isFirst ? '#00FF66' : '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node Index Label
      ctx.fillStyle = isFirst ? '#000000' : '#FFFFFF';
      ctx.font = '700 9px Fira Code, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((idx + 1).toString(), sp.x, sp.y);
    });

    // 4. Hover Cursor Indicator (Sitting exactly under mouse tip 1:1)
    if (!track.isClosed && mouseWorld) {
      const hoverPos = worldToCanvas(mouseWorld.x, mouseWorld.y);
      ctx.beginPath();
      ctx.arc(hoverPos.x, hoverPos.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00F0FF';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

  }, [canvasSize, offset, zoom, track, selectedNodeId, mouseWorld, worldToCanvas]);

  // Mouse Handlers using screenToWorld
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Right / Middle Click -> Pan
    if (e.button === 1 || e.button === 2) {
      setIsPanning(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / (rect.width || 1);
      const scaleY = canvas.height / (rect.height || 1);
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;
      setPanStart({ x: canvasX - offset.x, y: canvasY - offset.y });
      return;
    }

    const clickedWorld = screenToWorld(e.clientX, e.clientY);
    let foundNode: TrackNode | null = null;

    for (const node of track.nodes) {
      const dx = node.x - clickedWorld.x;
      const dy = node.y - clickedWorld.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 18 / zoom) {
        foundNode = node;
        break;
      }
    }

    if (foundNode) {
      // If clicking first node when loop is unclosed & >= 3 nodes -> Close Loop!
      if (foundNode.id === track.nodes[0]?.id && !track.isClosed && track.nodes.length >= 3) {
        setTrack(prev => ({ ...prev, isClosed: true }));
        setSelectedNodeId(null);
      } else {
        setSelectedNodeId(foundNode.id);
        setDraggedNodeId(foundNode.id);
      }
    } else {
      // Clicked on Empty Space -> Add Control Point!
      if (!track.isClosed) {
        onAddPoint(clickedWorld);
      } else {
        setSelectedNodeId(null);
        setIsPanning(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / (rect.width || 1);
        const scaleY = canvas.height / (rect.height || 1);
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;
        setPanStart({ x: canvasX - offset.x, y: canvasY - offset.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const currentWorld = screenToWorld(e.clientX, e.clientY);
    setMouseWorld(currentWorld);

    if (isPanning) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / (rect.width || 1);
      const scaleY = canvas.height / (rect.height || 1);
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;

      setOffset({ x: canvasX - panStart.x, y: canvasY - panStart.y });
      return;
    }

    if (draggedNodeId) {
      setTrack(prev => ({
        ...prev,
        nodes: prev.nodes.map(n =>
          n.id === draggedNodeId
            ? { ...n, x: Math.round(currentWorld.x), y: Math.round(currentWorld.y) }
            : n
        )
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.max(0.3, Math.min(2.5, prev * factor)));
  };

  return (
    <div className="relative w-full h-full bg-[#0B0E14] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className="cursor-crosshair w-full h-full block"
      />

      {/* Empty State Prompt */}
      {track.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-6">
          <div className="bg-[#121721]/90 backdrop-blur-md border border-[#1E2638] rounded-2xl p-8 max-w-sm shadow-2xl flex flex-col items-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#E10600] to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
              <Plus className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                TRACK DESIGNER
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Click anywhere on the canvas to place your first control point.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls Legend Overlay */}
      <div className="absolute top-4 left-4 bg-[#121721]/90 backdrop-blur-md border border-[#1E2638] rounded-xl p-3 text-xs text-slate-300 font-mono flex flex-col gap-1 shadow-lg pointer-events-none">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          EDITOR CONTROLS
        </div>
        <p>• <span className="text-white">Click Canvas:</span> Place Track Point</p>
        <p>• <span className="text-white">Drag Point:</span> Move Point</p>
        <p>• <span className="text-white">Click Point 1:</span> Close Circuit Loop</p>
        <p>• <span className="text-white">Right Drag:</span> Pan Canvas View</p>
      </div>
    </div>
  );
};
