import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TrackNode, TrackConfig, EditorTool } from '../../types/track';
import { buildTrackCurve, sampleSplinePoints, getNearestSplinePoint } from '../../utils/spline';
import { CornerInfo } from '../../utils/trackAnalysis';
import { Plus } from 'lucide-react';

interface EditorCanvasProps {
  track: TrackConfig;
  setTrack: (updater: TrackConfig | ((prev: TrackConfig) => TrackConfig), actionDescription?: string) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  activeTool: EditorTool;
  setActiveTool: (tool: EditorTool) => void;
  snapEnabled: boolean;
  onAddPoint: (point: { x: number; y: number }, snapAngle?: boolean) => void;
  onCloseCircuit: () => void;
  onMoveStartLine: (nodeId: string) => void;
  onZoomFitRequest?: () => void;
  corners?: CornerInfo[];
  isCalibrating?: boolean;
  calibrationPoints?: [{ x: number; y: number } | null, { x: number; y: number } | null];
  onCalibrationClick?: (pos: { x: number; y: number }) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  track,
  setTrack,
  selectedNodeId,
  setSelectedNodeId,
  selectedNodeIds,
  setSelectedNodeIds,
  activeTool,
  setActiveTool,
  snapEnabled,
  onAddPoint,
  onCloseCircuit,
  onMoveStartLine,
  corners = [],
  isCalibrating = false,
  calibrationPoints = [null, null],
  onCalibrationClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport transformation (Pan & Zoom)
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);

  // Mouse interaction state
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mouseWorld, setMouseWorld] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragInitialPositions, setDragInitialPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [dragStartWorld, setDragStartWorld] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Space-key pan state
  const isSpacePressedRef = useRef<boolean>(false);

  // Rubber-band multi-select box
  const [isSelectingBox, setIsSelectingBox] = useState<boolean>(false);
  const [selectionBoxStart, setSelectionBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionBoxEnd, setSelectionBoxEnd] = useState<{ x: number; y: number } | null>(null);

  // Context menu position
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // Map underlay image element cache
  const underlayImgRef = useRef<HTMLImageElement | null>(null);
  const [, setUnderlayLoadedTick] = useState<number>(0);

  useEffect(() => {
    if (!track.underlay?.imageUrl) {
      underlayImgRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      underlayImgRef.current = img;
      setUnderlayLoadedTick(prev => prev + 1);
    };
    img.src = track.underlay.imageUrl;
  }, [track.underlay?.imageUrl]);

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: window.innerWidth,
    height: window.innerHeight - 64
  });

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

  // Zoom-to-fit calculation
  const handleZoomToFit = useCallback(() => {
    if (track.nodes.length === 0) {
      setOffset({ x: 0, y: 0 });
      setZoom(1.0);
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    track.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    const padding = 120;
    const trackWidth = (maxX - minX) || 200;
    const trackHeight = (maxY - minY) || 200;

    const scaleX = (canvasSize.width - padding * 2) / trackWidth;
    const scaleY = (canvasSize.height - padding * 2) / trackHeight;
    const targetZoom = Math.max(0.2, Math.min(2.5, Math.min(scaleX, scaleY)));

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    setZoom(targetZoom);
    setOffset({ x: -midX * targetZoom, y: -midY * targetZoom });
  }, [track.nodes, canvasSize]);

  // Coordinate Conversion: Screen to World
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const worldX = (canvasX - canvas.width / 2 - offset.x) / zoom;
    const worldY = (canvasY - canvas.height / 2 - offset.y) / zoom;

    return { x: worldX, y: worldY };
  }, [offset, zoom]);

  // Coordinate Conversion: World to Canvas
  const worldToCanvas = useCallback((wx: number, wy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const cx = canvas.width / 2 + offset.x + wx * zoom;
    const cy = canvas.height / 2 + offset.y + wy * zoom;
    return { x: cx, y: cy };
  }, [offset, zoom]);

  // Keyboard navigation & Shortcuts (WASD Pan, F Zoom to Fit, Nudge, Space-drag)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        isSpacePressedRef.current = true;
      }

      // F Key: Zoom to fit
      if (e.code === 'KeyF') {
        handleZoomToFit();
      }

      // Tool switching shortcuts
      if (e.code === 'KeyP') setActiveTool('draw');
      if (e.code === 'KeyE') setActiveTool('edit');
      if (e.code === 'KeyX') setActiveTool('erase');

      // WASD Pan
      const panStep = (e.shiftKey ? 80 : 35);
      if (e.code === 'KeyW' && !e.ctrlKey) setOffset(prev => ({ ...prev, y: prev.y + panStep }));
      if (e.code === 'KeyS' && !e.ctrlKey) setOffset(prev => ({ ...prev, y: prev.y - panStep }));
      if (e.code === 'KeyA') setOffset(prev => ({ ...prev, x: prev.x + panStep }));
      if (e.code === 'KeyD') setOffset(prev => ({ ...prev, x: prev.x - panStep }));

      // Arrow keys: Nudge selected nodes (1m default, 10m with Shift)
      const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code);
      if (isArrow) {
        e.preventDefault();
        const activeIds = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
        if (activeIds.length > 0) {
          const step = e.shiftKey ? 10 : 1;
          const dx = e.code === 'ArrowLeft' ? -step : (e.code === 'ArrowRight' ? step : 0);
          const dy = e.code === 'ArrowUp' ? -step : (e.code === 'ArrowDown' ? step : 0);

          setTrack(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => {
              if (activeIds.includes(n.id) && !n.locked) {
                return { ...n, x: n.x + dx, y: n.y + dy };
              }
              return n;
            })
          }), `Nudge ${activeIds.length} node(s)`);
        }
      }

      // Delete / Backspace: Erase selected nodes
      if (e.code === 'Delete' || e.code === 'Backspace') {
        const activeIds = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
        if (activeIds.length > 0) {
          setTrack(prev => ({
            ...prev,
            nodes: prev.nodes.filter(n => !activeIds.includes(n.id)),
            isClosed: prev.nodes.length - activeIds.length < 3 ? false : prev.isClosed
          }), `Delete ${activeIds.length} node(s)`);
          setSelectedNodeId(null);
          setSelectedNodeIds([]);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleZoomToFit, selectedNodeId, selectedNodeIds, setTrack, setSelectedNodeId, setSelectedNodeIds, setActiveTool]);

  // Main Canvas Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Motorsport Technical Background Grid
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gridSizeMeters = snapEnabled ? 20 : 40;
    const gridPixelSize = gridSizeMeters * zoom;
    const startX = (offset.x + canvas.width / 2) % gridPixelSize;
    const startY = (offset.y + canvas.height / 2) % gridPixelSize;

    ctx.strokeStyle = snapEnabled ? '#1A2332' : '#141A26';
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

    // Origin Axes
    const origin = worldToCanvas(0, 0);
    ctx.strokeStyle = '#1E2B42';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(canvas.width, origin.y);
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, canvas.height);
    ctx.stroke();

    // 1.5 Map Tracing Underlay Image
    if (track.underlay?.visible && underlayImgRef.current) {
      const img = underlayImgRef.current;
      const center = worldToCanvas(track.underlay.x || 0, track.underlay.y || 0);
      const scale = (track.underlay.scale || 1.0) * zoom;
      const rotRad = ((track.underlay.rotation || 0) * Math.PI) / 180;
      const w = img.width * scale;
      const h = img.height * scale;

      ctx.save();
      ctx.globalAlpha = Math.max(0.05, Math.min(1.0, track.underlay.opacity ?? 0.5));
      ctx.translate(center.x, center.y);
      ctx.rotate(rotRad);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    // 2. Track Rendering
    if (track.nodes.length >= 2) {
      const curve = buildTrackCurve(track.nodes, track.isClosed);
      const samples = sampleSplinePoints(curve, track.nodes, 350);

      if (track.isClosed && samples.length > 0) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer Runoff / Sand Boundary
        ctx.beginPath();
        samples.forEach((p, idx) => {
          const sp = worldToCanvas(p.position.x, p.position.z);
          if (idx === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.strokeStyle = '#382D20';
        ctx.lineWidth = (track.defaultWidth + 18) * zoom;
        ctx.stroke();

        // Kerb Edges
        ctx.beginPath();
        samples.forEach((p, idx) => {
          const sp = worldToCanvas(p.position.x, p.position.z);
          if (idx === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.strokeStyle = '#E10600';
        ctx.lineWidth = (track.defaultWidth + 2.5) * zoom;
        ctx.stroke();

        // Asphalt Road Surface
        ctx.beginPath();
        samples.forEach((p, idx) => {
          const sp = worldToCanvas(p.position.x, p.position.z);
          if (idx === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.strokeStyle = '#1C2129';
        ctx.lineWidth = track.defaultWidth * zoom;
        ctx.stroke();

        // Centerline Dash
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
        const startNodeIdx = track.startIndex || 0;
        const startNode = track.nodes[startNodeIdx] || track.nodes[0];
        if (startNode) {
          const sPos = worldToCanvas(startNode.x, startNode.y);
          ctx.beginPath();
          ctx.arc(sPos.x, sPos.y, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#00FF66';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = '900 8px Fira Code, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('S/F', sPos.x, sPos.y);
        }
      } else {
        // Open Spline Preview
        ctx.beginPath();
        samples.forEach((p, idx) => {
          const sp = worldToCanvas(p.position.x, p.position.z);
          if (idx === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.strokeStyle = '#E10600';
        ctx.lineWidth = 4 * zoom;
        ctx.stroke();

        // Preview Line to cursor in Draw Mode
        const lastNode = track.nodes[track.nodes.length - 1];
        if (lastNode && !track.isClosed && activeTool === 'draw') {
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

    // 3. Draw Nodes
    const activeSelectedSet = new Set(selectedNodeIds);
    if (selectedNodeId) activeSelectedSet.add(selectedNodeId);

    const cornerMap = new Map<string, CornerInfo>();
    corners.forEach(c => cornerMap.set(c.nodeId, c));

    const drawPill = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
    };

    track.nodes.forEach((node, idx) => {
      const sp = worldToCanvas(node.x, node.y);
      const isSelected = activeSelectedSet.has(node.id);
      const isFirst = idx === (track.startIndex || 0);
      const isLocked = !!node.locked;

      // Outer Selection Ring
      if (isSelected || (idx === 0 && !track.isClosed && track.nodes.length >= 3 && activeTool === 'draw')) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 17, 0, Math.PI * 2);
        ctx.fillStyle = isFirst ? 'rgba(0, 255, 102, 0.25)' : 'rgba(225, 6, 0, 0.35)';
        ctx.fill();
        ctx.strokeStyle = isFirst ? '#00FF66' : '#E10600';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Main Node Circle
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 8.5, 0, Math.PI * 2);
      ctx.fillStyle = isFirst ? '#00FF66' : isSelected ? '#E10600' : isLocked ? '#2A344A' : '#121721';
      ctx.fill();
      ctx.strokeStyle = isLocked ? '#F59E0B' : (isFirst ? '#00FF66' : '#FFFFFF');
      ctx.lineWidth = isLocked ? 2.5 : 2;
      ctx.stroke();

      // Node Index Label
      ctx.fillStyle = isFirst ? '#000000' : '#FFFFFF';
      ctx.font = '700 9px Fira Code, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((idx + 1).toString(), sp.x, sp.y);

      // Lock Badge Indicator
      if (isLocked) {
        ctx.beginPath();
        ctx.arc(sp.x + 7, sp.y - 7, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
      }

      // Corner Badge (Turn Number / Name & Radius)
      const corner = cornerMap.get(node.id);
      if (corner && zoom >= 0.35) {
        const badgeText = `${corner.name} (${corner.radius}m)`;
        ctx.font = '700 9px Fira Code, monospace';
        const textWidth = ctx.measureText(badgeText).width;
        const badgeX = sp.x;
        const badgeY = sp.y - 18;

        ctx.fillStyle = isSelected ? 'rgba(225, 6, 0, 0.95)' : 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = isSelected ? '#FFFFFF' : '#38BDF8';
        ctx.lineWidth = 1;
        drawPill(badgeX - textWidth / 2 - 5, badgeY - 7, textWidth + 10, 14, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isSelected ? '#FFFFFF' : '#38BDF8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX, badgeY);
      }

      // Elevation Tag if non-zero
      if (node.elevation && node.elevation !== 0 && zoom >= 0.45) {
        const elevText = `${node.elevation > 0 ? '+' : ''}${node.elevation}m`;
        ctx.font = '600 8.5px Fira Code, monospace';
        const tW = ctx.measureText(elevText).width;
        const eY = sp.y + 16;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1;
        drawPill(sp.x - tW / 2 - 4, eY - 6, tW + 8, 12, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#34D399';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(elevText, sp.x, eY);
      }

      // Banking Tag if non-zero
      if (node.banking && node.banking !== 0 && zoom >= 0.45) {
        const bankText = `∠${node.banking > 0 ? '+' : ''}${node.banking}°`;
        ctx.font = '600 8.5px Fira Code, monospace';
        const tW = ctx.measureText(bankText).width;
        const bY = sp.y + (node.elevation && node.elevation !== 0 ? 30 : 16);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1;
        drawPill(sp.x - tW / 2 - 4, bY - 6, tW + 8, 12, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FBBF24';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bankText, sp.x, bY);
      }
    });

    // 4. Rubber-band Multi-Selection Box
    if (isSelectingBox && selectionBoxStart && selectionBoxEnd) {
      const sx = Math.min(selectionBoxStart.x, selectionBoxEnd.x);
      const sy = Math.min(selectionBoxStart.y, selectionBoxEnd.y);
      const sw = Math.abs(selectionBoxEnd.x - selectionBoxStart.x);
      const sh = Math.abs(selectionBoxEnd.y - selectionBoxStart.y);

      ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
    }

    // 5. Tool Cursor Indicator
    if (!track.isClosed && activeTool === 'draw' && mouseWorld) {
      const hoverPos = worldToCanvas(mouseWorld.x, mouseWorld.y);
      ctx.beginPath();
      ctx.arc(hoverPos.x, hoverPos.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00F0FF';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 6. Metric Calibration Pins & Line
    if (calibrationPoints && calibrationPoints[0]) {
      const p1 = worldToCanvas(calibrationPoints[0].x, calibrationPoints[0].y);
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#00F0FF';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (calibrationPoints[1]) {
        const p2 = worldToCanvas(calibrationPoints[1].x, calibrationPoints[1].y);
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [
    canvasSize,
    offset,
    zoom,
    track,
    selectedNodeId,
    selectedNodeIds,
    mouseWorld,
    worldToCanvas,
    activeTool,
    snapEnabled,
    isSelectingBox,
    selectionBoxStart,
    selectionBoxEnd,
    corners,
    calibrationPoints
  ]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setContextMenu(null);

    // Pan with Middle Click, Right Drag, or Space+LeftDrag
    if (e.button === 1 || e.button === 2 || isSpacePressedRef.current || activeTool === 'pan') {
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

    // If 2-Point Metric Scale Calibration is active, intercept clicks
    if (isCalibrating && onCalibrationClick) {
      onCalibrationClick(clickedWorld);
      return;
    }

    // Node hit testing
    let foundNode: TrackNode | null = null;
    for (const node of track.nodes) {
      const dx = node.x - clickedWorld.x;
      const dy = node.y - clickedWorld.y;
      if (Math.hypot(dx, dy) <= 18 / zoom) {
        foundNode = node;
        break;
      }
    }

    // Handle ERASE Tool
    if (activeTool === 'erase') {
      if (foundNode) {
        setTrack(prev => ({
          ...prev,
          nodes: prev.nodes.filter(n => n.id !== foundNode!.id),
          isClosed: prev.nodes.length - 1 < 3 ? false : prev.isClosed
        }), `Erase node ${foundNode.id}`);
        setSelectedNodeId(null);
        setSelectedNodeIds(prev => prev.filter(id => id !== foundNode!.id));
      }
      return;
    }

    // Handle Node Click
    if (foundNode) {
      // Loop closing condition in Draw mode
      if (activeTool === 'draw' && foundNode.id === track.nodes[0]?.id && !track.isClosed && track.nodes.length >= 3) {
        onCloseCircuit();
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
        return;
      }

      // Multi-select with Shift
      if (e.shiftKey) {
        setSelectedNodeIds(prev =>
          prev.includes(foundNode!.id) ? prev.filter(id => id !== foundNode!.id) : [...prev, foundNode!.id]
        );
        setSelectedNodeId(foundNode.id);
      } else {
        if (!selectedNodeIds.includes(foundNode.id)) {
          setSelectedNodeIds([foundNode.id]);
          setSelectedNodeId(foundNode.id);
        } else {
          setSelectedNodeId(foundNode.id);
        }
      }

      // Prepare translation for dragged node(s)
      setDraggedNodeId(foundNode.id);
      setDragStartWorld(clickedWorld);
      const initMap = new Map<string, { x: number; y: number }>();
      const movingNodes = selectedNodeIds.includes(foundNode.id)
        ? track.nodes.filter(n => selectedNodeIds.includes(n.id))
        : [foundNode];
      movingNodes.forEach(n => initMap.set(n.id, { x: n.x, y: n.y }));
      setDragInitialPositions(initMap);
      return;
    }

    // Clicked empty canvas space
    if (activeTool === 'draw') {
      if (!track.isClosed) {
        onAddPoint(clickedWorld, e.shiftKey);
      }
    } else {
      // Edit mode: Start rubber-band selection box
      if (!e.shiftKey) {
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / (rect.width || 1);
        const scaleY = canvas.height / (rect.height || 1);
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        setIsSelectingBox(true);
        setSelectionBoxStart({ x: cx, y: cy });
        setSelectionBoxEnd({ x: cx, y: cy });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    let currentWorld = screenToWorld(e.clientX, e.clientY);

    // Apply Shift 15-degree snapping to cursor relative to last node in Draw Mode
    if (e.shiftKey && activeTool === 'draw' && track.nodes.length > 0 && !track.isClosed) {
      const last = track.nodes[track.nodes.length - 1];
      const dx = currentWorld.x - last.x;
      const dy = currentWorld.y - last.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const snapAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
      currentWorld = {
        x: last.x + Math.cos(snapAngle) * dist,
        y: last.y + Math.sin(snapAngle) * dist
      };
    }

    setMouseWorld(currentWorld);

    // Pan Viewport
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

    // Drag nodes
    if (draggedNodeId && dragInitialPositions.size > 0) {
      const deltaX = currentWorld.x - dragStartWorld.x;
      const deltaY = currentWorld.y - dragStartWorld.y;

      setTrack(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => {
          if (dragInitialPositions.has(n.id) && !n.locked) {
            const init = dragInitialPositions.get(n.id)!;
            let nx = init.x + deltaX;
            let ny = init.y + deltaY;
            if (snapEnabled) {
              nx = Math.round(nx / 5) * 5;
              ny = Math.round(ny / 5) * 5;
            }
            return { ...n, x: Math.round(nx), y: Math.round(ny) };
          }
          return n;
        })
      }));
      return;
    }

    // Update Rubber-band selection box
    if (isSelectingBox && selectionBoxStart) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / (rect.width || 1);
      const scaleY = canvas.height / (rect.height || 1);
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      setSelectionBoxEnd({ x: cx, y: cy });

      // Calculate enclosed nodes
      const wStart = screenToWorld(selectionBoxStart.x / scaleX + rect.left, selectionBoxStart.y / scaleY + rect.top);
      const minX = Math.min(wStart.x, currentWorld.x);
      const maxX = Math.max(wStart.x, currentWorld.x);
      const minY = Math.min(wStart.y, currentWorld.y);
      const maxY = Math.max(wStart.y, currentWorld.y);

      const enclosedIds = track.nodes
        .filter(n => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY)
        .map(n => n.id);

      setSelectedNodeIds(enclosedIds);
      if (enclosedIds.length === 1) setSelectedNodeId(enclosedIds[0]);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);

    if (draggedNodeId) {
      setDraggedNodeId(null);
      setDragInitialPositions(new Map());
      setTrack(prev => prev, 'Move node(s)');
    }

    if (isSelectingBox) {
      setIsSelectingBox(false);
      setSelectionBoxStart(null);
      setSelectionBoxEnd(null);
    }
  };

  // Double Click: Insert Node into Track Edge
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const clickedWorld = screenToWorld(e.clientX, e.clientY);
    if (track.nodes.length < 2) return;

    // Build curve and sample points to find nearest segment
    const curve = buildTrackCurve(track.nodes, track.isClosed);
    const samples = sampleSplinePoints(curve, track.nodes, 350);
    const { point, distance } = getNearestSplinePoint({ x: clickedWorld.x, y: 0, z: clickedWorld.y }, samples);

    const hitThreshold = (track.defaultWidth / 2 + 10);
    if (point && distance <= hitThreshold) {
      // Find between which two nodes this spline point lies
      let bestSegment = 0;
      let minSegDistSq = Infinity;
      const n = track.nodes.length;
      const maxIter = track.isClosed ? n : n - 1;

      for (let i = 0; i < maxIter; i++) {
        const n1 = track.nodes[i];
        const n2 = track.nodes[(i + 1) % n];

        const segX = n2.x - n1.x;
        const segY = n2.y - n1.y;
        const segLenSq = segX * segX + segY * segY;
        if (segLenSq === 0) continue;

        let t = ((clickedWorld.x - n1.x) * segX + (clickedWorld.y - n1.y) * segY) / segLenSq;
        t = Math.max(0, Math.min(1, t));
        const px = n1.x + t * segX;
        const py = n1.y + t * segY;
        const dSq = (clickedWorld.x - px) ** 2 + (clickedWorld.y - py) ** 2;

        if (dSq < minSegDistSq) {
          minSegDistSq = dSq;
          bestSegment = i;
        }
      }

      const newNode: TrackNode = {
        id: Date.now().toString(),
        x: Math.round(clickedWorld.x),
        y: Math.round(clickedWorld.y),
        elevation: 0,
        width: track.defaultWidth
      };

      const newNodes = [...track.nodes];
      newNodes.splice(bestSegment + 1, 0, newNode);

      setTrack(prev => ({
        ...prev,
        nodes: newNodes
      }), `Insert node between ${bestSegment + 1} and ${bestSegment + 2}`);
      setSelectedNodeId(newNode.id);
      setSelectedNodeIds([newNode.id]);
    }
  };

  // Right Click Context Menu: Quick Actions (Delete, Lock, Set Start/Finish)
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const clickedWorld = screenToWorld(e.clientX, e.clientY);

    let foundNode: TrackNode | null = null;
    for (const node of track.nodes) {
      const dx = node.x - clickedWorld.x;
      const dy = node.y - clickedWorld.y;
      if (Math.hypot(dx, dy) <= 20 / zoom) {
        foundNode = node;
        break;
      }
    }

    if (foundNode) {
      setSelectedNodeId(foundNode.id);
      if (!selectedNodeIds.includes(foundNode.id)) {
        setSelectedNodeIds([foundNode.id]);
      }
      setContextMenu({ x: e.clientX, y: e.clientY, nodeId: foundNode.id });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom(prev => Math.max(0.15, Math.min(3.5, prev * factor)));
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
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        className={`w-full h-full block ${activeTool === 'pan' ? 'cursor-grab' : activeTool === 'erase' ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
      />

      {/* Context Menu Modal on Right Click */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y - 64, left: contextMenu.x }}
          className="absolute z-50 bg-[#161D2B] border border-[#243046] rounded-xl shadow-2xl py-1 w-48 text-xs font-mono text-slate-200"
        >
          <button
            onClick={() => {
              onMoveStartLine(contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-emerald-950/80 hover:text-emerald-400 transition-colors flex items-center justify-between"
          >
            <span>Set Start/Finish</span>
            <span className="text-[10px] text-emerald-500 font-bold">S/F</span>
          </button>
          <button
            onClick={() => {
              setTrack(prev => ({
                ...prev,
                nodes: prev.nodes.map(n => n.id === contextMenu.nodeId ? { ...n, locked: !n.locked } : n)
              }), `Toggle lock on node`);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-amber-950/80 hover:text-amber-400 transition-colors flex items-center justify-between"
          >
            <span>Toggle Lock</span>
            <span className="text-[10px] text-amber-500 font-bold">Lock</span>
          </button>
          <div className="h-px bg-[#243046] my-1" />
          <button
            onClick={() => {
              setTrack(prev => ({
                ...prev,
                nodes: prev.nodes.filter(n => n.id !== contextMenu.nodeId),
                isClosed: prev.nodes.length - 1 < 3 ? false : prev.isClosed
              }), `Delete node`);
              setSelectedNodeId(null);
              setSelectedNodeIds(prev => prev.filter(id => id !== contextMenu.nodeId));
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-950/80 hover:text-red-300 transition-colors flex items-center justify-between"
          >
            <span>Delete Point</span>
            <span className="text-[10px] text-red-500 font-bold">Del</span>
          </button>
        </div>
      )}

      {/* Empty State Prompt */}
      {track.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-6">
          <div className="bg-[#121721]/90 backdrop-blur-md border border-[#1E2638] rounded-2xl p-8 max-w-sm shadow-2xl flex flex-col items-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#E10600] to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
              <Plus className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                TRACK SHAPE STUDIO
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Click anywhere to place control points, or press <span className="text-white font-bold">P</span> for Draw, <span className="text-white font-bold">E</span> for Edit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Editor Status Bar */}
      <div className="absolute bottom-4 left-4 bg-[#121721]/90 backdrop-blur-md border border-[#1E2638] rounded-xl px-3 py-2 text-xs text-slate-300 font-mono flex items-center gap-4 shadow-lg pointer-events-none">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          TOOL: <strong className="text-white uppercase">{activeTool}</strong>
        </span>
        <span>•</span>
        <span>SNAP: <strong className={snapEnabled ? 'text-cyan-400' : 'text-slate-500'}>{snapEnabled ? 'ON (20m)' : 'OFF'}</strong></span>
        <span>•</span>
        <span>SELECTED: <strong className="text-white">{selectedNodeIds.length > 0 ? `${selectedNodeIds.length} nodes` : (selectedNodeId ? '1 node' : 'None')}</strong></span>
        <span>•</span>
        <span>ZOOM: <strong className="text-white">{Math.round(zoom * 100)}%</strong></span>
      </div>
    </div>
  );
};
