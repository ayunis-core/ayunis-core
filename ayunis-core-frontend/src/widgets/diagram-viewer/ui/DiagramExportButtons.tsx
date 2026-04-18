import { Button } from '@/shared/ui/shadcn/button';
import { Download } from 'lucide-react';
import { useCallback, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { showError } from '@/shared/lib/toast';

interface DiagramExportButtonsProps {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly fileName: string;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeTitle(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'diagram';
}

export function DiagramExportButtons({
  containerRef,
  fileName,
}: DiagramExportButtonsProps) {
  const { t } = useTranslation('artifacts');

  const handleSvgExport = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    triggerDownload(blob, `${safeTitle(fileName)}.svg`);
  }, [containerRef, fileName]);

  const handlePngExport = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const width = svg.clientWidth || 800;
      const height = svg.clientHeight || 600;
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        showError(t('diagram.export.failed'));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          triggerDownload(pngBlob, `${safeTitle(fileName)}.png`);
        }
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showError(t('diagram.export.failed'));
    };
    img.src = url;
  }, [containerRef, fileName, t]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={handleSvgExport}
      >
        <Download className="mr-1 size-3.5" />
        {t('diagram.export.svg')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={handlePngExport}
      >
        <Download className="mr-1 size-3.5" />
        {t('diagram.export.png')}
      </Button>
    </>
  );
}
