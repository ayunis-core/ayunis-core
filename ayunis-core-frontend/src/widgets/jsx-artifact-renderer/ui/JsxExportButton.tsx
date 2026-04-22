import { Button } from '@/shared/ui/shadcn/button';
import { Download } from 'lucide-react';
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';

interface JsxExportButtonProps {
  readonly iframeRef: RefObject<HTMLIFrameElement | null>;
  readonly fileName: string;
}

function triggerDownload(dataUrl: string, fileName: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function safeTitle(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'jsx-artifact';
}

export function JsxExportButton({ iframeRef, fileName }: JsxExportButtonProps) {
  const { t } = useTranslation('artifacts');
  const pendingRef = useRef(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // eslint-disable-next-line sonarjs/different-types-comparison -- MessageEventSource and Window | null do overlap at runtime; TS narrowing gets confused
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as {
        type?: string;
        dataUrl?: string;
        error?: string;
      };
      if (data.type !== 'export-png-result') return;
      if (!pendingRef.current) return;
      pendingRef.current = false;
      if (data.dataUrl) {
        triggerDownload(data.dataUrl, `${safeTitle(fileName)}.png`);
      } else {
        showError(t('jsx.export.failed'));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [iframeRef, fileName, t]);

  const handleExport = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      showError(t('jsx.export.failed'));
      return;
    }
    pendingRef.current = true;
    // Sandboxed srcdoc iframes have a null origin, so '*' is the only usable target.
    // eslint-disable-next-line sonarjs/post-message -- srcdoc sandbox has null origin; no specific target origin exists
    iframe.contentWindow.postMessage({ type: 'export-png' }, '*');
  }, [iframeRef, t]);

  return (
    <Button variant="outline" size="sm" className="h-8" onClick={handleExport}>
      <Download className="mr-1 size-3.5" />
      {t('jsx.export.png')}
    </Button>
  );
}
