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

function computeSvgDimensions(svg: SVGSVGElement): {
  width: number;
  height: number;
} {
  const viewBox = svg.viewBox.baseVal;
  const rect = svg.getBoundingClientRect();
  const width =
    (viewBox.width > 0 ? viewBox.width : 0) ||
    svg.clientWidth ||
    rect.width ||
    800;
  const height =
    (viewBox.height > 0 ? viewBox.height : 0) ||
    svg.clientHeight ||
    rect.height ||
    600;
  return { width, height };
}

function svgToDataUrl(svg: SVGSVGElement, width: number, height: number) {
  const cloned = svg.cloneNode(true) as SVGSVGElement;
  if (!cloned.getAttribute('xmlns')) {
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  cloned.setAttribute('width', String(width));
  cloned.setAttribute('height', String(height));
  const svgString = new XMLSerializer().serializeToString(cloned);
  // Data URLs render more reliably than blob URLs when rasterising SVG
  // into an Image/Canvas pipeline across browsers.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

function rasteriseToPng(
  img: HTMLImageElement,
  width: number,
  height: number,
): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }
    // Fill with white so transparent SVG regions don't become black on
    // some rasterisers — Mermaid diagrams are authored against a light
    // canvas.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    try {
      canvas.toBlob((pngBlob) => resolve(pngBlob), 'image/png');
    } catch (err) {
      reject(err instanceof Error ? err : new Error('toBlob failed'));
    }
  });
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

    const { width, height } = computeSvgDimensions(svg);
    const svgDataUrl = svgToDataUrl(svg, width, height);
    const fail = () => showError(t('diagram.export.failed'));

    const img = new Image();
    img.onload = () => {
      rasteriseToPng(img, width, height)
        .then((pngBlob) => {
          if (pngBlob) {
            triggerDownload(pngBlob, `${safeTitle(fileName)}.png`);
          } else {
            fail();
          }
        })
        .catch(fail);
    };
    img.onerror = fail;
    img.src = svgDataUrl;
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
