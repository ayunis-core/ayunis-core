import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '@/features/theme';
import { cn } from '@/shared/lib/shadcn/utils';

interface MermaidRendererProps {
  readonly source: string;
  readonly className?: string;
  /** Forwarded ref to the container so callers can serialise the rendered SVG for export. */
  readonly containerRef?: React.RefObject<HTMLDivElement | null>;
}

const BRAND_PRIMARY = '#8178c3';

export function MermaidRenderer({
  source,
  className,
  containerRef: externalRef,
}: MermaidRendererProps) {
  const { theme } = useTheme();
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = externalRef ?? internalRef;
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
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = '';
        }
        setError(null);
        return;
      }
      try {
        const { svg } = await mermaid.render(renderId, source);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
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
  }, [source, theme, containerRef, renderId]);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-auto p-4 [&>svg]:max-h-full [&>svg]:max-w-full"
      />
      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
