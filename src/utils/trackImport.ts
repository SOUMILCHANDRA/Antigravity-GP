import { TrackConfig, TrackNode } from '../types/track';

type Coordinate = [number, number, number?];

const makeTrack = (name: string, nodes: TrackNode[], isClosed: boolean): TrackConfig => ({
  id: `import_${Date.now()}`,
  name,
  nodes,
  isClosed,
  defaultWidth: 14,
  asphaltColor: '#222222',
  version: 2,
  startIndex: 0,
  facilities: [],
  venueStyle: 'gp'
});

function readGeoJson(value: unknown): Coordinate[][] {
  if (!value || typeof value !== 'object') return [];
  const item = value as Record<string, unknown>;
  if (item.type === 'FeatureCollection' && Array.isArray(item.features)) return item.features.flatMap(readGeoJson);
  if (item.type === 'Feature') return readGeoJson(item.geometry);
  if (item.type === 'GeometryCollection' && Array.isArray(item.geometries)) return item.geometries.flatMap(readGeoJson);
  if (item.type === 'LineString' && Array.isArray(item.coordinates)) return [item.coordinates as Coordinate[]];
  if (item.type === 'MultiLineString' && Array.isArray(item.coordinates)) return item.coordinates as Coordinate[][];
  return [];
}

function makeGpsTrack(name: string, coordinates: Coordinate[]): TrackConfig {
  if (coordinates.length < 2) throw new Error('The file does not contain a usable track line.');
  const originLon = coordinates.reduce((sum, point) => sum + point[0], 0) / coordinates.length;
  const originLat = coordinates.reduce((sum, point) => sum + point[1], 0) / coordinates.length;
  const cosLatitude = Math.cos(originLat * Math.PI / 180);
  let local = coordinates.map(([longitude, latitude, altitude]) => ({
    x: (longitude - originLon) * 111320 * cosLatitude,
    y: -(latitude - originLat) * 110540,
    elevation: Number.isFinite(altitude) ? altitude as number : 0
  }));
  const elevations = local.map(point => point.elevation);
  const elevationBase = Math.min(...elevations);
  local = local.map(point => ({ ...point, elevation: point.elevation - elevationBase }));

  const distance = (a: typeof local[number], b: typeof local[number]) => Math.hypot(a.x - b.x, a.y - b.y);
  const approxLength = local.slice(1).reduce((sum, point, index) => sum + distance(point, local[index]), 0);
  const isClosed = local.length > 4 && distance(local[0], local[local.length - 1]) < 50;
  if (isClosed) local = local.slice(0, -1);
  if (local.length > 120) {
    const source = local;
    local = Array.from({ length: 120 }, (_, index) => source[Math.round(index * (source.length - 1) / 119)]);
  }
  const nodes = local.map((point, index) => ({
    id: `gps_${index}_${Date.now()}`,
    x: Number(point.x.toFixed(2)),
    y: Number(point.y.toFixed(2)),
    elevation: Number(point.elevation.toFixed(1)),
    width: 14,
    banking: 0,
    runoffWidth: 8.5
  }));
  if (isClosed && nodes.length < 3) throw new Error('A closed circuit needs at least three distinct points.');
  if (approxLength < 20) throw new Error('The imported line is too short to form a circuit.');
  return makeTrack(name, nodes, isClosed);
}

function readGpx(text: string): Coordinate[] {
  const points = [...text.matchAll(/<(?:[\w.-]+:)?(?:trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?(?:trkpt|rtept)\s*>|<(?:[\w.-]+:)?(?:trkpt|rtept)\b([^>]*)\/?\s*>/gi)];
  return points.map(match => {
    const attributes = match[1] || match[3] || '';
    const lat = Number(attributes.match(/\blat=["']([^"']+)["']/i)?.[1]);
    const lon = Number(attributes.match(/\blon=["']([^"']+)["']/i)?.[1]);
    const elevation = Number(match[2]?.match(/<(?:[\w.-]+:)?ele[^>]*>([^<]+)/i)?.[1] || 0);
    return [lon, lat, elevation] as Coordinate;
  }).filter(point => Number.isFinite(point[0]) && Number.isFinite(point[1]));
}

function readKml(text: string): Coordinate[] {
  const blocks = [...text.matchAll(/<(?:[\w.-]+:)?coordinates\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?coordinates\s*>/gi)]
    .map(match => match[1].trim().split(/\s+/).map((token) => {
      const values = token.split(',').map(Number);
      return [values[0], values[1], values[2]] as Coordinate;
    }))
    .map(points => points.filter(point => Number.isFinite(point[0]) && Number.isFinite(point[1])))
    .sort((a, b) => b.length - a.length);
  return blocks[0] || [];
}

export function importTrackFile(text: string, fileName: string): TrackConfig {
  const extension = fileName.toLowerCase().split('.').pop();
  const name = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') || 'Imported circuit';
  if (extension === 'gpx') return makeGpsTrack(name, readGpx(text));
  if (extension === 'kml') return makeGpsTrack(name, readKml(text));
  if (extension === 'geojson' || extension === 'json') {
    const data: unknown = JSON.parse(text);
    const lines = readGeoJson(data).sort((a, b) => b.length - a.length);
    if (lines.length) return makeGpsTrack(name, lines[0]);
    const parsed = data as Partial<TrackConfig>;
    if (!Array.isArray(parsed.nodes) || parsed.nodes.length < 2) throw new Error('JSON must be a saved Antigravity circuit or a GeoJSON LineString.');
    return {
      ...parsed,
      id: parsed.id || `import_${Date.now()}`,
      name: parsed.name || name,
      defaultWidth: parsed.defaultWidth || 14,
      asphaltColor: parsed.asphaltColor || '#222222',
      version: parsed.version || 2,
      facilities: parsed.facilities || [],
      venueStyle: parsed.venueStyle || 'gp'
    } as TrackConfig;
  }
  throw new Error('Choose an Antigravity JSON circuit, GPX route, KML line, or GeoJSON LineString.');
}
