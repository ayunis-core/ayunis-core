import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AttributionControl,
  LngLatBounds,
  Map,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type MapGeoJSONFeature,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import type { Geometry, Position } from 'geojson';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import config from '@/shared/config';
import type { ToolUseMessageContent } from '../../model/openapi';
import { parseMapParams, type MapParams } from '../../lib/parse-map-params';

interface GeoJsonMapWidgetProps {
  content: ToolUseMessageContent;
  isStreaming: boolean;
}

const SOURCE_ID = 'map-data';
const INTERACTIVE_LAYER_IDS = ['map-points', 'map-lines', 'map-polygons'];

export default function GeoJsonMapWidget({
  content,
  isStreaming,
}: Readonly<GeoJsonMapWidgetProps>) {
  const { t } = useTranslation('chat');
  const containerRef = useRef<HTMLDivElement>(null);
  const params = useMemo(
    () => parseMapParams(content.params),
    [content.params],
  );

  useEffect(() => {
    if (!params || !containerRef.current) return;
    const map = createMap(containerRef.current, params);
    return () => map.remove();
  }, [params]);

  if (!params) {
    return (
      <Card className="my-2">
        <CardContent className="py-6 text-sm text-muted-foreground">
          {isStreaming ? t('chat.map.loading') : t('chat.map.invalid')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-2 overflow-hidden">
      <CardHeader>
        <CardTitle>{params.title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div
          ref={containerRef}
          className="h-[360px] w-full"
          aria-label={t('chat.map.ariaLabel', { title: params.title })}
        />
      </CardContent>
      <CardFooter className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{config.map.attribution}</span>
        <span>{params.attribution}</span>
      </CardFooter>
    </Card>
  );
}

function createMap(container: HTMLElement, params: MapParams): Map {
  setWorkerUrl(maplibreWorkerUrl);
  const map = new Map({
    container,
    style: createBasemapStyle(),
    center: [0, 0],
    zoom: 1,
    attributionControl: false,
    transformRequest: (url) => ({
      url,
      referrerPolicy: 'origin-when-cross-origin',
    }),
  });
  map.addControl(new NavigationControl(), 'top-right');
  map.addControl(new AttributionControl({ compact: true }));
  map.on('load', () => initializeMap(map, params));
  return map;
}

function createBasemapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: [config.map.tileUrl],
        tileSize: 256,
        attribution: config.map.attribution,
      },
    },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  };
}

function initializeMap(map: Map, params: MapParams): void {
  map.addSource(SOURCE_ID, { type: 'geojson', data: params.geojson });
  addGeometryLayers(map);
  frameFeatures(map, params);
  registerFeaturePopups(map);
}

function addGeometryLayers(map: Map): void {
  map.addLayer({
    id: 'map-polygons',
    type: 'fill',
    source: SOURCE_ID,
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': '#0f766e', 'fill-opacity': 0.25 },
  });
  map.addLayer({
    id: 'map-polygon-outlines',
    type: 'line',
    source: SOURCE_ID,
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'line-color': '#0f766e', 'line-width': 2 },
  });
  map.addLayer({
    id: 'map-lines',
    type: 'line',
    source: SOURCE_ID,
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#2563eb', 'line-width': 4 },
  });
  map.addLayer({
    id: 'map-points',
    type: 'circle',
    source: SOURCE_ID,
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-color': '#dc2626',
      'circle-radius': 7,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  });
}

function frameFeatures(map: Map, params: MapParams): void {
  const positions = params.geojson.features.flatMap((feature) =>
    collectPositions(feature.geometry),
  );
  if (positions.length === 1 && positions[0]) {
    map.jumpTo({ center: positions[0] as [number, number], zoom: 14 });
    return;
  }
  const bounds = positions.reduce(
    (current, position) => current.extend(position as [number, number]),
    new LngLatBounds(),
  );
  map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 0 });
}

function collectPositions(geometry: Geometry): Position[] {
  return collectCoordinatePositions(
    'coordinates' in geometry ? geometry.coordinates : [],
  );
}

function collectCoordinatePositions(value: unknown): Position[] {
  if (
    Array.isArray(value) &&
    (value.length === 2 || value.length === 3) &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return [[value[0], value[1]]];
  }
  return Array.isArray(value) ? value.flatMap(collectCoordinatePositions) : [];
}

function registerFeaturePopups(map: Map): void {
  for (const layerId of INTERACTIVE_LAYER_IDS) {
    map.on('click', layerId, (event) => showFeaturePopup(map, event));
  }
}

function showFeaturePopup(map: Map, event: MapMouseEvent): void {
  const feature = map
    .queryRenderedFeatures(event.point, { layers: INTERACTIVE_LAYER_IDS })
    .at(0);
  if (!feature) return;
  new Popup()
    .setLngLat(event.lngLat)
    .setDOMContent(createPropertiesContent(feature))
    .addTo(map);
}

function createPropertiesContent(feature: MapGeoJSONFeature): HTMLElement {
  const content = document.createElement('dl');
  content.className = 'space-y-1 text-sm';
  for (const [key, value] of Object.entries(feature.properties)) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.className = 'font-medium';
    term.textContent = key;
    description.textContent = value === null ? '' : String(value);
    row.append(term, description);
    content.append(row);
  }
  return content;
}
