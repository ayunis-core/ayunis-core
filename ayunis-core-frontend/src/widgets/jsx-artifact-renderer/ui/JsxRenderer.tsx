import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/shadcn/utils';
import { buildSandboxSrcdoc } from '../lib/buildSandboxSrcdoc';

interface JsxRendererProps {
  readonly source: string;
  readonly className?: string;
  readonly iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export function JsxRenderer({
  source,
  className,
  iframeRef: externalRef,
}: JsxRendererProps) {
  const { t } = useTranslation('artifacts');
  const internalRef = useRef<HTMLIFrameElement>(null);
  const iframeRef = externalRef ?? internalRef;
  const [error, setError] = useState<string | null>(null);

  // Reset stale errors during render when the source changes (e.g. switching
  // artifact versions) so the previous version's error doesn't flash on the
  // new iframe while it boots. Using React's recommended "state-from-props"
  // pattern rather than a setState-in-effect, which would trigger an extra
  // render pass.
  const [lastSource, setLastSource] = useState(source);
  if (lastSource !== source) {
    setLastSource(source);
    setError(null);
  }

  const srcdoc = useMemo(() => buildSandboxSrcdoc(source), [source]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // eslint-disable-next-line sonarjs/different-types-comparison -- MessageEventSource and Window | null do overlap at runtime; TS narrowing gets confused
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string; message?: string };
      if (data.type === 'jsx-error' && typeof data.message === 'string') {
        setError(data.message);
      }
      if (data.type === 'jsx-ready') {
        setError(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [iframeRef]);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <iframe
        ref={iframeRef}
        key={source}
        title={t('jsx.sandboxTitle')}
        sandbox="allow-scripts"
        srcDoc={srcdoc}
        className="flex-1 w-full border-0 bg-background"
      />
      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive max-h-40 overflow-auto whitespace-pre-wrap font-mono">
          {error}
        </div>
      )}
    </div>
  );
}
