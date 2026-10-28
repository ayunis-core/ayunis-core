import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  Position,
} from 'geojson';

const MAX_PAYLOAD_BYTES = 1_048_576;
const MAX_FEATURES = 500;
const MAX_POSITIONS = 20_000;
const MAX_PROPERTIES = 50;
const MAX_PROPERTY_LENGTH = 5_000;

const SUPPORTED_GEOMETRIES = new Set([
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
]);

type SupportedGeometry = Exclude<Geometry, { type: 'GeometryCollection' }>;

export interface MapParams {
  schemaVersion: 1;
  title: string;
  attribution: string;
  geojson: FeatureCollection<SupportedGeometry, GeoJsonProperties>;
}

export function parseMapParams(value: unknown): MapParams | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  if (serializedSize(value) > MAX_PAYLOAD_BYTES) return null;
  if (!isNonEmptyString(value.title) || !isNonEmptyString(value.attribution)) {
    return null;
  }
  const geojson = parseFeatureCollection(value.geojson);
  if (!geojson) return null;
  return {
    schemaVersion: 1,
    title: value.title,
    attribution: value.attribution,
    geojson,
  };
}

function parseFeatureCollection(
  value: unknown,
): FeatureCollection<SupportedGeometry, GeoJsonProperties> | null {
  if (!isRecord(value) || value.type !== 'FeatureCollection') return null;
  if (
    !Array.isArray(value.features) ||
    value.features.length === 0 ||
    value.features.length > MAX_FEATURES
  ) {
    return null;
  }
  const budget = { positions: 0 };
  if (!value.features.every((feature) => isSupportedFeature(feature, budget))) {
    return null;
  }
  return value as unknown as FeatureCollection<
    SupportedGeometry,
    GeoJsonProperties
  >;
}

function isSupportedFeature(
  value: unknown,
  budget: { positions: number },
): value is Feature {
  return (
    isRecord(value) &&
    value.type === 'Feature' &&
    isPlainTextProperties(value.properties) &&
    isSupportedGeometry(value.geometry, budget)
  );
}

function isPlainTextProperties(value: unknown): value is GeoJsonProperties {
  if (!isRecord(value) || Object.keys(value).length > MAX_PROPERTIES) {
    return false;
  }
  return Object.values(value).every(
    (property) =>
      property === null ||
      (typeof property === 'string' &&
        property.length <= MAX_PROPERTY_LENGTH) ||
      typeof property === 'number' ||
      typeof property === 'boolean',
  );
}

function isSupportedGeometry(
  value: unknown,
  budget: { positions: number },
): value is SupportedGeometry {
  if (!isRecord(value) || !SUPPORTED_GEOMETRIES.has(String(value.type))) {
    return false;
  }
  return hasValidCoordinates(String(value.type), value.coordinates, budget);
}

function hasValidCoordinates(
  type: string,
  value: unknown,
  budget: { positions: number },
): boolean {
  switch (type) {
    case 'Point':
      return countPosition(value, budget);
    case 'MultiPoint':
      return isPositionArray(value, 1, budget);
    case 'LineString':
      return isPositionArray(value, 2, budget);
    case 'MultiLineString':
      return isArrayOf(value, (line) => isPositionArray(line, 2, budget));
    case 'Polygon':
      return isPolygon(value, budget);
    case 'MultiPolygon':
      return isArrayOf(value, (polygon) => isPolygon(polygon, budget));
    default:
      return false;
  }
}

function isPolygon(value: unknown, budget: { positions: number }): boolean {
  return isArrayOf(value, (ring) => isClosedRing(ring, budget));
}

function isClosedRing(value: unknown, budget: { positions: number }): boolean {
  if (!isPositionArray(value, 4, budget)) return false;
  const first = value[0];
  const last = value.at(-1);
  return first[0] === last?.[0] && first[1] === last[1];
}

function isPositionArray(
  value: unknown,
  minimumLength: number,
  budget: { positions: number },
): value is Position[] {
  return (
    Array.isArray(value) &&
    value.length >= minimumLength &&
    value.every((position) => countPosition(position, budget))
  );
}

function countPosition(
  value: unknown,
  budget: { positions: number },
): value is Position {
  if (!isPosition(value)) return false;
  budget.positions += 1;
  return budget.positions <= MAX_POSITIONS;
}

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    (value.length === 2 || value.length === 3) &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1]) &&
    value[1] >= -90 &&
    value[1] <= 90 &&
    (value.length === 2 ||
      (typeof value[2] === 'number' && Number.isFinite(value[2])))
  );
}

function isArrayOf(
  value: unknown,
  predicate: (item: unknown) => boolean,
): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(predicate);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function serializedSize(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
