import { useEffect, useRef, useState, type RefObject } from 'react';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';

const ZOOM_STEP = 1.2;
// fit-viewport fits the bounding box edge to edge, which clips outer labels.
const FIT_MARGIN = 0.9;

interface ZoomableCanvas {
  zoom(newScale?: number | 'fit-viewport', center?: 'auto'): number;
  resized(): void;
}

interface BpmnCanvasProps {
  readonly xml: string;
  readonly viewerRef: RefObject<NavigatedViewer | null>;
}

function getCanvas(viewer: NavigatedViewer): ZoomableCanvas {
  return viewer.get<ZoomableCanvas>('canvas');
}

function fitToViewport(viewer: NavigatedViewer): void {
  const canvas = getCanvas(viewer);
  canvas.zoom(canvas.zoom('fit-viewport', 'auto') * FIT_MARGIN, 'auto');
}

export function BpmnCanvas({ xml, viewerRef }: BpmnCanvasProps) {
  const { t } = useTranslation('artifacts');
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const viewer = new NavigatedViewer({ container });
    viewerRef.current = viewer;
    // diagram-js caches the container size; the side panel is resizable.
    const resizeObserver = new ResizeObserver(() =>
      getCanvas(viewer).resized(),
    );
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [viewerRef]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !xml.trim()) return;
    let cancelled = false;

    viewer
      .importXML(xml)
      .then(() => {
        if (cancelled) return;
        fitToViewport(viewer);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [xml, viewerRef]);

  const zoomBy = (factor: number) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const canvas = getCanvas(viewer);
    canvas.zoom(canvas.zoom() * factor);
  };

  const fit = () => {
    if (viewerRef.current) fitToViewport(viewerRef.current);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        {/* BPMN shapes are drawn in black, so the canvas stays white in dark mode. */}
        <div
          ref={containerRef}
          className="h-full w-full bg-white"
          data-testid="bpmn-canvas"
        />
        {/* Bottom-left: the bpmn.io watermark in the bottom-right corner must stay visible (license). */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md border bg-background/80 p-1 shadow-sm backdrop-blur">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => zoomBy(ZOOM_STEP)}
            title={t('diagram.zoom.in')}
            aria-label={t('diagram.zoom.in')}
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
            title={t('diagram.zoom.out')}
            aria-label={t('diagram.zoom.out')}
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={fit}
            title={t('diagram.zoom.reset')}
            aria-label={t('diagram.zoom.reset')}
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>
      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {t('bpmn.renderFailed')}: {error}
        </div>
      )}
    </div>
  );
}
