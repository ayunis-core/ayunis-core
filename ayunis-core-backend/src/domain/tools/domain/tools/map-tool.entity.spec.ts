import { MapTool } from './map-tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

const pointFeature = {
  type: 'Feature' as const,
  properties: { label: 'Rathaus', population: 75456, open: true },
  geometry: { type: 'Point' as const, coordinates: [9.1829, 48.7758] },
};

function params(features: unknown[]) {
  return {
    schemaVersion: 1,
    title: 'Stuttgarter Geodaten',
    attribution: 'Landeshauptstadt Stuttgart, CC BY 4.0',
    geojson: { type: 'FeatureCollection', features },
  };
}

describe('MapTool', () => {
  let tool: MapTool;

  beforeEach(() => {
    tool = new MapTool();
  });

  it('is a versioned map displayable tool', () => {
    expect(tool.type).toBe(ToolType.MAP);
    expect(tool.name).toBe('map');
    expect(tool.parameters).toMatchObject({
      required: ['schemaVersion', 'title', 'attribution', 'geojson'],
      additionalProperties: false,
    });
  });

  it.each([
    ['Point', [9.1829, 48.7758]],
    [
      'MultiPoint',
      [
        [9.1829, 48.7758],
        [9.19, 48.78],
      ],
    ],
    [
      'LineString',
      [
        [9.17, 48.77],
        [9.2, 48.79],
      ],
    ],
    [
      'MultiLineString',
      [
        [
          [9.17, 48.77],
          [9.2, 48.79],
        ],
      ],
    ],
    [
      'Polygon',
      [
        [
          [9.17, 48.77],
          [9.2, 48.77],
          [9.2, 48.79],
          [9.17, 48.77],
        ],
      ],
    ],
    [
      'MultiPolygon',
      [
        [
          [
            [9.17, 48.77],
            [9.2, 48.77],
            [9.2, 48.79],
            [9.17, 48.77],
          ],
        ],
      ],
    ],
  ])('accepts RFC 7946 %s geometry', (type, coordinates) => {
    const input = params([
      {
        type: 'Feature',
        properties: { label: `${type} example` },
        geometry: { type, coordinates },
      },
    ]);

    expect(tool.validateParams(input)).toEqual(input);
  });

  it('accepts an optional RFC 7946 altitude coordinate', () => {
    const input = params([
      {
        ...pointFeature,
        geometry: { type: 'Point', coordinates: [9.1829, 48.7758, 247] },
      },
    ]);

    expect(tool.validateParams(input)).toEqual(input);
  });

  it('rejects whitespace-only title and attribution', () => {
    expect(() =>
      tool.validateParams({ ...params([pointFeature]), title: '   ' }),
    ).toThrow('title must contain non-whitespace text');
    expect(() =>
      tool.validateParams({ ...params([pointFeature]), attribution: '\t' }),
    ).toThrow('attribution must contain non-whitespace text');
  });

  it('rejects unsupported geometry types', () => {
    expect(() =>
      tool.validateParams(
        params([
          {
            ...pointFeature,
            geometry: { type: 'GeometryCollection', geometries: [] },
          },
        ]),
      ),
    ).toThrow('Invalid parameters');
  });

  it('rejects coordinates outside longitude-latitude bounds', () => {
    expect(() =>
      tool.validateParams(
        params([
          {
            ...pointFeature,
            geometry: { type: 'Point', coordinates: [190, 48.7758] },
          },
        ]),
      ),
    ).toThrow('longitude must be between -180 and 180');
  });

  it('rejects polygon rings that are not closed', () => {
    expect(() =>
      tool.validateParams(
        params([
          {
            ...pointFeature,
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [9.17, 48.77],
                  [9.2, 48.77],
                  [9.2, 48.79],
                  [9.18, 48.78],
                ],
              ],
            },
          },
        ]),
      ),
    ).toThrow('polygon rings must start and end at the same position');
  });

  it('rejects payloads over one mebibyte', () => {
    const features = Array.from({ length: 300 }, (_, index) => ({
      ...pointFeature,
      properties: { label: `Location ${index}`, details: 'x'.repeat(4000) },
    }));

    expect(() => tool.validateParams(params(features))).toThrow(
      'payload must not exceed 1048576 bytes',
    );
  });

  it('rejects payloads with more than 20000 positions', () => {
    const coordinates = Array.from({ length: 20_001 }, (_, index) => [
      9 + index / 1_000_000,
      48,
    ]);

    expect(() =>
      tool.validateParams(
        params([
          {
            ...pointFeature,
            geometry: { type: 'LineString', coordinates },
          },
        ]),
      ),
    ).toThrow('GeoJSON must not contain more than 20000 positions');
  });
});
