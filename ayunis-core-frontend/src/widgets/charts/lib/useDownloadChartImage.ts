import { useCallback, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { slugifyForCssVar } from './ChartUtils';

export function useDownloadChartImage(title?: string) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  /** Resolves `true` once the image download started. */
  const download = useCallback(async (): Promise<boolean> => {
    const node = chartRef.current;
    if (!node) return false;

    setIsDownloading(true);
    try {
      // Wide charts (many x-axis points) render wider than their scrollable
      // container, so the node overflows horizontally. html-to-image sizes the
      // capture from clientWidth/clientHeight by default, which clips the
      // overflow on the right. Capture the full scroll size instead.
      const dataUrl = await toPng(node, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        width: node.scrollWidth,
        height: node.scrollHeight,
      });

      const link = document.createElement('a');
      link.download = `${slugifyForCssVar(title ?? 'chart')}.png`;
      link.href = dataUrl;
      link.click();
      return true;
    } finally {
      setIsDownloading(false);
    }
  }, [title]);

  return { chartRef, download, isDownloading };
}
