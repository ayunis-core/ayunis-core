import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/features/theme';
import { Button } from '@/shared/ui/shadcn/button';
import { cn } from '@/shared/lib/shadcn/utils';

interface MermaidRendererProps {
  readonly source: string;
  readonly className?: string;
  /** Forwarded ref to the container so callers can serialise the rendered SVG for export. */
  readonly containerRef?: React.RefObject<HTMLDivElement | null>;
}

const BRAND_PRIMARY = '#8178c3';
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

export function MermaidRenderer({
  source,
  className,
  containerRef: externalRef,
}: MermaidRendererProps) {
  const { theme } = useTheme();
  const { t } = useTranslation('artifacts');
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = externalRef ?? internalRef;
  const svgHolderRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const rawId = useId();
  // mermaid rejects IDs containing ":"; useId returns something like ":r1:"
  const renderId = `mermaid-${rawId.replace(/:/g, '')}`;

  useEffect(() => {
    let cancelled = false;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'strict',
      fontFamily: 'inherit',
      themeVariables: {
        // Unify node fills across diagram types (flowchart, mindmap, etc.)
        // on the brand purple so all shapes read as solid brand surfaces
        // with white text — mermaid's base theme otherwise picks a very
        // light mainBkg that makes white node text invisible.
        primaryColor: BRAND_PRIMARY,
        primaryBorderColor: BRAND_PRIMARY,
        primaryTextColor: '#ffffff',
        mainBkg: BRAND_PRIMARY,
        nodeTextColor: '#ffffff',
        lineColor: theme === 'dark' ? '#a6a3b8' : '#3b3a4a',
        background: theme === 'dark' ? '#1a1825' : '#ffffff',
      },
    });

    const render = async () => {
      if (!source.trim()) {
        if (!cancelled && svgHolderRef.current) {
          svgHolderRef.current.innerHTML = '';
        }
        setError(null);
        return;
      }
      try {
        const { svg } = await mermaid.render(renderId, source);
        if (!cancelled && svgHolderRef.current) {
          svgHolderRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to render diagram',
          );
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [source, theme, renderId]);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <TransformWrapper
          key={source}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
          wheel={{ step: 0.03 }}
          doubleClick={{ disabled: true }}
          limitToBounds={false}
          centerOnInit
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <TransformComponent
                wrapperClass="!h-full !w-full"
                contentClass="!h-full !w-full items-center justify-center"
              >
                <div
                  ref={svgHolderRef}
                  className="flex h-full w-full items-center justify-center p-4"
                />
              </TransformComponent>
              <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md border bg-background/80 p-1 shadow-sm backdrop-blur">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => zoomIn()}
                  title={t('diagram.zoom.in')}
                  aria-label={t('diagram.zoom.in')}
                >
                  <ZoomIn className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => zoomOut()}
                  title={t('diagram.zoom.out')}
                  aria-label={t('diagram.zoom.out')}
                >
                  <ZoomOut className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => resetTransform()}
                  title={t('diagram.zoom.reset')}
                  aria-label={t('diagram.zoom.reset')}
                >
                  <Maximize2 className="size-4" />
                </Button>
              </div>
            </>
          )}
        </TransformWrapper>
      </div>
      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
