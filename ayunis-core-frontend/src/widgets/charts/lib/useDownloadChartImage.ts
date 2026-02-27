import { useCallback, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { slugifyForCssVar } from './ChartUtils';

export function useDownloadChartImage(title?: string) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async () => {
    const node = chartRef.current;
    if (!node) return;

    setIsDownloading(true);
    try {
      const dataUrl = await toPng(node, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (domNode) => {
          if (domNode instanceof Element) {
            return !domNode.hasAttribute('data-exclude-from-export');
          }
          return true;
        },
      });

      const link = document.createElement('a');
      link.download = `${slugifyForCssVar(title ?? 'chart')}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsDownloading(false);
    }
  }, [title]);

  return { chartRef, download, isDownloading };
}
