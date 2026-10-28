import { Buffer } from 'node:buffer';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { JSONSchema } from 'json-schema-to-ts';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

const MAX_PAYLOAD_BYTES = 1_048_576;
const MAX_POSITIONS = 20_000;

const positionSchema = {
  type: 'array' as const,
  items: { type: 'number' as const },
  minItems: 2,
  maxItems: 3,
};

const lineStringCoordinatesSchema = {
  type: 'array' as const,
  items: positionSchema,
  minItems: 2,
  maxItems: 25_000,
};

const polygonCoordinatesSchema = {
  type: 'array' as const,
  items: {
    type: 'array' as const,
    items: positionSchema,
    minItems: 4,
    maxItems: 25_000,
  },
  minItems: 1,
  maxItems: 100,
};

const supportedGeometrySchemas = [
  {
    type: 'object' as const,
    properties: {
      type: { type: 'string' as const, enum: ['Point'] },
      coordinates: positionSchema,
    },
    required: ['type', 'coordinates'],
    additionalProperties: false,
  },
  {
    type: 'object' as const,
    properties: {
      type: { type: 'string' as const, enum: ['MultiPoint'] },
      coordinates: {
        type: 'array' as const,
        items: positionSchema,
        minItems: 1,
        maxItems: 25_000,
      },
    },
    required: ['type', 'coordinates'],
    additionalProperties: false,
  },
  {
    type: 'object' as const,
    properties: {
      type: { type: 'string' as const, enum: ['LineString'] },
      coordinates: lineStringCoordinatesSchema,
    },
    required: ['type', 'coordinates'],
    additionalProperties: false,
  },
  {
    type: 'object' as const,
    properties: {
      type: { type: 'string' as const, enum: ['MultiLineString'] },
      coordinates: {
        type: 'array' as const,
        items: lineStringCoordinatesSchema,
        minItems: 1,
        maxItems: 100,
      },
    },
    required: ['type', 'coordinates'],
    additionalProperties: false,
  },
  {
    type: 'object' as const,
    properties: {
      type: { type: 'string' as const, enum: ['Polygon'] },
      coordinates: polygonCoordinatesSchema,
    },
    required: ['type', 'coordinates'],
    additionalProperties: false,
  },
  {
    type: 'object' as const,
    properties: {
      type: { type: 'string' as const, enum: ['MultiPolygon'] },
      coordinates: {
        type: 'array' as const,
        items: polygonCoordinatesSchema,
        minItems: 1,
        maxItems: 100,
      },
    },
    required: ['type', 'coordinates'],
    additionalProperties: false,
  },
] as const satisfies readonly JSONSchema[];

const mapToolParameters = {
  type: 'object' as const,
  properties: {
    schemaVersion: {
      type: 'integer' as const,
      enum: [1],
      description: 'The map widget schema version. Always use 1.',
    },
    title: {
      type: 'string' as const,
      minLength: 1,
      maxLength: 200,
      description: 'A concise title for the map.',
    },
    attribution: {
      type: 'string' as const,
      minLength: 1,
      maxLength: 500,
      description: 'Required attribution for the supplied GeoJSON data.',
    },
    geojson: {
      type: 'object' as const,
      properties: {
        type: { type: 'string' as const, enum: ['FeatureCollection'] },
        features: {
          type: 'array' as const,
          minItems: 1,
          maxItems: 500,
          items: {
            type: 'object' as const,
            properties: {
              type: { type: 'string' as const, enum: ['Feature'] },
              properties: {
                type: 'object' as const,
                maxProperties: 50,
                additionalProperties: {
                  oneOf: [
                    { type: 'string' as const, maxLength: 5_000 },
                    { type: 'number' as const },
                    { type: 'boolean' as const },
                    { type: 'null' as const },
                  ],
                },
              },
              geometry: { oneOf: supportedGeometrySchemas },
            },
            required: ['type', 'properties', 'geometry'],
            additionalProperties: false,
          },
        },
      },
      required: ['type', 'features'],
      additionalProperties: false,
      description:
        'RFC 7946 GeoJSON FeatureCollection. Coordinates must use [longitude, latitude] order.',
    },
  },
  required: ['schemaVersion', 'title', 'attribution', 'geojson'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type Position = [number, number];
type Coordinates = Position | Coordinates[];
interface MapGeometry {
  type: string;
  coordinates: Coordinates;
}
interface MapToolParameters {
  schemaVersion: 1;
  title: string;
  attribution: string;
  geojson: {
    type: 'FeatureCollection';
    features: Array<{ geometry: MapGeometry }>;
  };
}

export class MapTool extends Tool {
  constructor() {
    super({
      name: ToolType.MAP,
      description:
        'Display locations, routes, or areas on an interactive map from GeoJSON. Use RFC 7946 [longitude, latitude] coordinate order.',
      descriptionLong:
        'Use map to display one or more known locations, routes, or areas. Provide a FeatureCollection containing Point, MultiPoint, LineString, MultiLineString, Polygon, or MultiPolygon features. Include short plain-text feature properties such as label and details, plus attribution for the data source. Do not use this tool to calculate routes or geocode place names.',
      parameters: mapToolParameters,
      type: ToolType.MAP,
    });
  }

  validateParams(params: Record<string, unknown>): MapToolParameters {
    const validated = validateToolParams<MapToolParameters>(
      this.parameters,
      params,
    );
    assertTextMetadata(validated);
    assertPayloadSize(validated);
    assertValidGeoJson(validated);
    return validated;
  }

  get returnsPii(): boolean {
    return false;
  }
}

function assertTextMetadata(params: MapToolParameters): void {
  if (!params.title.trim()) {
    throw new Error('Map title must contain non-whitespace text');
  }
  if (!params.attribution.trim()) {
    throw new Error('Map attribution must contain non-whitespace text');
  }
}

function assertPayloadSize(params: MapToolParameters): void {
  if (Buffer.byteLength(JSON.stringify(params), 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new Error(`Map payload must not exceed ${MAX_PAYLOAD_BYTES} bytes`);
  }
}

function assertValidGeoJson(params: MapToolParameters): void {
  let positionCount = 0;
  for (const feature of params.geojson.features) {
    const positions = collectPositions(feature.geometry.coordinates);
    for (const position of positions) assertValidPosition(position);
    assertClosedPolygonRings(feature.geometry);
    positionCount += positions.length;
    if (positionCount > MAX_POSITIONS) {
      throw new Error(
        `GeoJSON must not contain more than ${MAX_POSITIONS} positions`,
      );
    }
  }
}

function collectPositions(coordinates: Coordinates): Position[] {
  if (isPosition(coordinates)) return [coordinates];
  return coordinates.flatMap(collectPositions);
}

function isPosition(coordinates: Coordinates): coordinates is Position {
  return (
    (coordinates.length === 2 || coordinates.length === 3) &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number'
  );
}

function assertValidPosition([longitude, latitude]: Position): void {
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('GeoJSON longitude must be between -180 and 180');
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('GeoJSON latitude must be between -90 and 90');
  }
}

function assertClosedPolygonRings(geometry: MapGeometry): void {
  if (geometry.type === 'Polygon') {
    assertRingsClosed(geometry.coordinates as Position[][]);
  }
  if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates as Position[][][]) {
      assertRingsClosed(polygon);
    }
  }
}

function assertRingsClosed(rings: Position[][]): void {
  for (const ring of rings) {
    const first = ring[0];
    const last = ring.at(-1);
    if (first[0] !== last?.[0] || first[1] !== last[1]) {
      throw new Error(
        'GeoJSON polygon rings must start and end at the same position',
      );
    }
  }
}
