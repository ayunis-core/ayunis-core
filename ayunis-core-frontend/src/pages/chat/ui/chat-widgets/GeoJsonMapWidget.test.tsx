import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import GeoJsonMapWidget from './GeoJsonMapWidget';

const mapMocks = vi.hoisted(() => {
  const mapOptions: Array<{
    transformRequest?: (url: string) => {
      url: string;
      referrerPolicy: ReferrerPolicy;
    };
  }> = [];
  const api = {
    addControl: vi.fn(),
    addLayer: vi.fn(),
    addSource: vi.fn(),
    fitBounds: vi.fn(),
    jumpTo: vi.fn(),
    on: vi.fn(),
    queryRenderedFeatures: vi.fn(),
    remove: vi.fn(),
  };
  const bounds = { extend: vi.fn().mockReturnThis() };
  return {
    api,
    bounds,
    mapOptions,
    Map: vi.fn(function MockMap(options) {
      mapOptions.push(options);
      return api;
    }),
    setDOMContent: vi.fn(),
    addTo: vi.fn(),
    setWorkerUrl: vi.fn(),
  };
});

vi.mock('maplibre-gl', () => ({
  Map: mapMocks.Map,
  NavigationControl: vi.fn(),
  AttributionControl: vi.fn(),
  Popup: vi.fn(function MockPopup() {
    return {
      setLngLat: vi.fn().mockReturnThis(),
      setDOMContent: mapMocks.setDOMContent.mockReturnThis(),
      addTo: mapMocks.addTo.mockReturnThis(),
    };
  }),
  LngLatBounds: vi.fn(function MockBounds() {
    return mapMocks.bounds;
  }),
  setWorkerUrl: mapMocks.setWorkerUrl,
}));

vi.mock('@/shared/config', () => ({
  default: {
    map: {
      tileUrl: 'https://tiles.example.test/{z}/{x}/{y}.png',
      attribution: 'Example basemap',
    },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const geometries = [
  { type: 'Point', coordinates: [9.18, 48.77] },
  {
    type: 'MultiPoint',
    coordinates: [
      [9.19, 48.78],
      [9.2, 48.79],
    ],
  },
  {
    type: 'LineString',
    coordinates: [
      [9.18, 48.77],
      [9.22, 48.8],
    ],
  },
  {
    type: 'MultiLineString',
    coordinates: [
      [
        [9.18, 48.77],
        [9.2, 48.79],
      ],
    ],
  },
  {
    type: 'Polygon',
    coordinates: [
      [
        [9.17, 48.76],
        [9.2, 48.76],
        [9.2, 48.79],
        [9.17, 48.76],
      ],
    ],
  },
  {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [9.2, 48.78],
          [9.22, 48.78],
          [9.22, 48.8],
          [9.2, 48.78],
        ],
      ],
    ],
  },
];

function toolUse(
  features = geometries.map((geometry, index) => ({
    type: 'Feature',
    properties: { label: `Feature ${index + 1}` },
    geometry,
  })),
): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'map-1',
    name: 'map',
    params: {
      schemaVersion: 1,
      title: 'Route and service areas',
      attribution: 'Municipal open data, CC BY 4.0',
      geojson: { type: 'FeatureCollection', features },
    },
  };
}

describe('GeoJsonMapWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapMocks.api.on.mockImplementation(
      (event: string, layerOrListener: string | (() => void)) => {
        if (event === 'load' && typeof layerOrListener === 'function') {
          layerOrListener();
        }
        return mapMocks.api;
      },
    );
  });

  it('renders point, line, polygon, and multi-geometries and frames all features', () => {
    render(<GeoJsonMapWidget content={toolUse()} isStreaming={false} />);

    expect(mapMocks.setWorkerUrl).toHaveBeenCalledWith(
      expect.stringContaining('maplibre-gl-worker'),
    );
    expect(mapMocks.Map).toHaveBeenCalledWith(
      expect.objectContaining({
        transformRequest: expect.any(Function),
      }),
    );
    const transformRequest = mapMocks.mapOptions[0]?.transformRequest;
    expect(transformRequest?.('https://tiles.example.test/1/2/3.png')).toEqual({
      url: 'https://tiles.example.test/1/2/3.png',
      referrerPolicy: 'origin-when-cross-origin',
    });
    expect(screen.getByText('Route and service areas')).toBeTruthy();
    expect(screen.getByText('Municipal open data, CC BY 4.0')).toBeTruthy();
    expect(screen.queryByText('Example basemap')).toBeNull();
    expect(mapMocks.Map).toHaveBeenCalledWith(
      expect.objectContaining({
        style: expect.objectContaining({
          sources: expect.objectContaining({
            basemap: expect.objectContaining({
              attribution: 'Example basemap',
            }),
          }),
        }),
      }),
    );
    expect(mapMocks.api.addSource).toHaveBeenCalledWith(
      'map-data',
      expect.objectContaining({
        type: 'geojson',
        data: expect.objectContaining({ features: expect.any(Array) }),
      }),
    );
    expect(
      mapMocks.api.addLayer.mock.calls.map(([layer]) => layer.type),
    ).toEqual(expect.arrayContaining(['circle', 'line', 'fill']));
    expect(mapMocks.api.fitBounds).toHaveBeenCalled();
  });

  it('does not repeat basemap attribution supplied as data attribution', () => {
    const content = toolUse();
    content.params.attribution = 'Example basemap';

    render(<GeoJsonMapWidget content={content} isStreaming={false} />);

    expect(screen.queryAllByText('Example basemap')).toHaveLength(0);
  });

  it('uses a sensible street-level zoom for a single point', () => {
    render(
      <GeoJsonMapWidget
        content={toolUse([
          {
            type: 'Feature',
            properties: { label: 'Rathaus' },
            geometry: { type: 'Point', coordinates: [9.1829, 48.7758] },
          },
        ])}
        isStreaming={false}
      />,
    );

    expect(mapMocks.api.jumpTo).toHaveBeenCalledWith({
      center: [9.1829, 48.7758],
      zoom: 14,
    });
    expect(mapMocks.api.fitBounds).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', toolUse([])],
    ['invalid', { ...toolUse(), params: { schemaVersion: 1 } }],
  ])('shows an error state for %s historical payloads', (_name, content) => {
    render(<GeoJsonMapWidget content={content} isStreaming={false} />);

    expect(screen.getByText('chat.map.invalid')).toBeTruthy();
    expect(mapMocks.Map).not.toHaveBeenCalled();
  });

  it('renders feature properties as text rather than HTML', () => {
    mapMocks.api.queryRenderedFeatures.mockReturnValue([
      {
        properties: {
          label: '<img src=x onerror=alert(1)>',
          details: '<script>alert(1)</script>',
        },
      },
    ]);
    render(<GeoJsonMapWidget content={toolUse()} isStreaming={false} />);
    const clickCall = mapMocks.api.on.mock.calls.find(
      ([event, layer]) => event === 'click' && layer === 'map-points',
    );

    clickCall?.[2]({ lngLat: [9.18, 48.77] });

    const popupContent = mapMocks.setDOMContent.mock
      .calls[0]?.[0] as HTMLElement;
    expect(popupContent.textContent).toContain('<script>alert(1)</script>');
    expect(popupContent.querySelector('script')).toBeNull();
    expect(popupContent.querySelector('img')).toBeNull();
  });
});
