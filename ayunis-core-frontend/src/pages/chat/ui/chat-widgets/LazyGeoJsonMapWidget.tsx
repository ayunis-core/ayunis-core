import { lazy, Suspense } from 'react';
import type { ToolUseMessageContent } from '../../model/openapi';

const GeoJsonMapWidget = lazy(() => import('./GeoJsonMapWidget'));

interface LazyGeoJsonMapWidgetProps {
  content: ToolUseMessageContent;
  isStreaming: boolean;
}

export default function LazyGeoJsonMapWidget(
  props: Readonly<LazyGeoJsonMapWidgetProps>,
) {
  return (
    <Suspense fallback={null}>
      <GeoJsonMapWidget {...props} />
    </Suspense>
  );
}
