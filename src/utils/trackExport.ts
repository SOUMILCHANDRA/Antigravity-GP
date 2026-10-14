import { SplinePoint, TrackConfig } from '../types/track';
import { LapSimulationResult } from './headlessSim';

/**
 * Downloads an in-memory string as a file in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports complete TrackConfig as standard JSON file
 */
export function exportCircuitJSON(track: TrackConfig) {
  const exportPayload: TrackConfig = {
    ...track,
    version: 2
  };
  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const sanitizedName = (track.name || 'Antigravity_Circuit')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  downloadFile(jsonStr, `${sanitizedName}_circuit.json`, 'application/json');
}

/**
 * Generates an engineering vector SVG technical blueprint of the circuit
 */
export function generateCircuitSVG(
  track: TrackConfig,
  splinePoints: SplinePoint[],
  simResult?: LapSimulationResult
): string {
  if (track.nodes.length < 2) return '';

  // Determine bounding box in 2D coordinates (X, Y)
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of track.nodes) {
    if (node.x < minX) minX = node.x;
    if (node.x > maxX) maxX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.y > maxY) maxY = node.y;
  }

  const padding = 140;
  const circuitWidth = Math.max(200, maxX - minX);
  const circuitHeight = Math.max(200, maxY - minY);
  const width = circuitWidth + padding * 2;
  const height = circuitHeight + padding * 2;

  // Track path from nodes / spline
  const points = splinePoints.length > 0 ? splinePoints : track.nodes.map(n => ({ position: { x: n.x, y: 0, z: n.y } }));
  const pathData = points
    .map((p, idx) => {
      const px = ('position' in p ? p.position.x : (p as any).x) - minX + padding;
      const py = ('position' in p ? p.position.z : (p as any).y) - minY + padding;
      return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(' ') + (track.isClosed ? ' Z' : '');

  const startFinishNode = track.nodes[track.startIndex || 0] || track.nodes[0];
  const sfX = startFinishNode.x - minX + padding;
  const sfY = startFinishNode.y - minY + padding;

  // Generate turns SVG badges
  const turnBadges = (simResult?.turns || []).map(turn => {
    const pt = splinePoints[turn.cornerIndex];
    if (!pt) return '';
    const tx = pt.position.x - minX + padding;
    const ty = pt.position.z - minY + padding;
    return `
      <g transform="translate(${tx.toFixed(1)}, ${ty.toFixed(1)})">
        <circle r="14" fill="#1E293B" stroke="#00E5FF" stroke-width="2" />
        <text y="4" text-anchor="middle" fill="#FFFFFF" font-size="10" font-family="monospace" font-weight="bold">${turn.label}</text>
      </g>
    `;
  }).join('');

  const lengthKm = simResult ? (simResult.totalLengthMeters / 1000).toFixed(3) : '---';
  const fiaGrade = simResult?.fiaGrade.grade || 'Grade 1';
  const estLap = simResult?.formattedLapTime || '--:--.---';
  const estTopSpeed = simResult?.topSpeedKmh || '---';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #0B0E14;">
  <defs>
    <!-- Technical Blueprint Grid -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" stroke-width="0.8" opacity="0.6"/>
    </pattern>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Grid -->
  <rect width="100%" height="100%" fill="#0B0E14" />
  <rect width="100%" height="100%" fill="url(#grid)" />

  <!-- Technical Circuit Outer Edge / Runoff Buffer -->
  <path d="${pathData}" fill="none" stroke="#334155" stroke-width="${track.defaultWidth + 14}" stroke-linecap="round" stroke-linejoin="round" opacity="0.4" />

  <!-- Main Circuit Ribbon Asphalt -->
  <path d="${pathData}" fill="none" stroke="${track.asphaltColor || '#222222'}" stroke-width="${track.defaultWidth}" stroke-linecap="round" stroke-linejoin="round" />

  <!-- White Track Boundary Lines -->
  <path d="${pathData}" fill="none" stroke="#FFFFFF" stroke-width="${track.defaultWidth}" stroke-dasharray="0" opacity="0.1" />
  <path d="${pathData}" fill="none" stroke="#E2E8F0" stroke-width="1.8" stroke-dasharray="8 6" opacity="0.7" />

  <!-- Centerline / Racing Guide -->
  <path d="${pathData}" fill="none" stroke="#00E5FF" stroke-width="1.2" opacity="0.4" />

  <!-- Turn Badges -->
  ${turnBadges}

  <!-- Start / Finish Line Anchor -->
  <g transform="translate(${sfX.toFixed(1)}, ${sfY.toFixed(1)})">
    <circle r="18" fill="#10B981" opacity="0.2" filter="url(#glow)"/>
    <circle r="8" fill="#10B981" stroke="#FFFFFF" stroke-width="2"/>
    <text y="-14" text-anchor="middle" fill="#10B981" font-size="11" font-family="monospace" font-weight="bold">START / FINISH</text>
  </g>

  <!-- Technical Circuit Blueprint Title Block -->
  <g transform="translate(30, 40)">
    <rect width="320" height="150" rx="8" fill="#111827" stroke="#1F2937" stroke-width="1.5" opacity="0.95" />
    <text x="18" y="28" fill="#00E5FF" font-size="16" font-family="system-ui, sans-serif" font-weight="900" letter-spacing="1.5">
      ${(track.name || 'ANTIGRAVITY CIRCUIT').toUpperCase()}
    </text>
    <text x="18" y="48" fill="#94A3B8" font-size="11" font-family="monospace">
      HOMOLOGATION: <tspan fill="#F59E0B" font-weight="bold">${fiaGrade}</tspan>
    </text>

    <!-- Circuit Metrics Grid -->
    <line x1="18" y1="58" x2="302" y2="58" stroke="#374151" stroke-width="1" />
    <text x="18" y="78" fill="#64748B" font-size="10" font-family="monospace">TOTAL LENGTH</text>
    <text x="18" y="96" fill="#F8FAFC" font-size="13" font-family="monospace" font-weight="bold">${lengthKm} km</text>

    <text x="125" y="78" fill="#64748B" font-size="10" font-family="monospace">TURNS</text>
    <text x="125" y="96" fill="#F8FAFC" font-size="13" font-family="monospace" font-weight="bold">${simResult?.turns.length || track.nodes.length}</text>

    <text x="210" y="78" fill="#64748B" font-size="10" font-family="monospace">EST. LAP</text>
    <text x="210" y="96" fill="#10B981" font-size="13" font-family="monospace" font-weight="bold">${estLap}</text>

    <text x="18" y="122" fill="#64748B" font-size="10" font-family="monospace">TOP SPEED</text>
    <text x="18" y="138" fill="#38BDF8" font-size="12" font-family="monospace" font-weight="bold">${estTopSpeed} km/h</text>

    <text x="125" y="122" fill="#64748B" font-size="10" font-family="monospace">WIDTH</text>
    <text x="125" y="138" fill="#F8FAFC" font-size="12" font-family="monospace" font-weight="bold">${track.defaultWidth} m</text>
  </g>

  <!-- Scale Indicator in Bottom Right -->
  <g transform="translate(${width - 200}, ${height - 40})">
    <rect x="0" y="0" width="160" height="2" fill="#FFFFFF" opacity="0.8"/>
    <line x1="0" y1="-4" x2="0" y2="6" stroke="#FFFFFF" stroke-width="2"/>
    <line x1="80" y1="-2" x2="80" y2="4" stroke="#FFFFFF" stroke-width="1"/>
    <line x1="160" y1="-4" x2="160" y2="6" stroke="#FFFFFF" stroke-width="2"/>
    <text x="80" y="-8" text-anchor="middle" fill="#94A3B8" font-size="10" font-family="monospace">SCALE: 160 METERS</text>
  </g>
</svg>`;

  return svg;
}

/**
 * Downloads SVG Vector Technical Blueprint
 */
export function exportCircuitSVG(track: TrackConfig, splinePoints: SplinePoint[], simResult?: LapSimulationResult) {
  const svgContent = generateCircuitSVG(track, splinePoints, simResult);
  if (!svgContent) return;
  const sanitizedName = (track.name || 'Antigravity_Circuit')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  downloadFile(svgContent, `${sanitizedName}_blueprint.svg`, 'image/svg+xml');
}

/**
 * Exports High-Res PNG Poster by rendering SVG on an off-screen HTML5 Canvas
 */
export async function exportCircuitPNG(track: TrackConfig, splinePoints: SplinePoint[], simResult?: LapSimulationResult): Promise<void> {
  const svgContent = generateCircuitSVG(track, splinePoints, simResult);
  if (!svgContent) return;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2.0; // 2x Retina resolution
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        if (blob) {
          const sanitizedName = (track.name || 'Antigravity_Circuit')
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '_');
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${sanitizedName}_poster.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          resolve();
        } else {
          reject(new Error('PNG blob creation failed'));
        }
      }, 'image/png');
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}
