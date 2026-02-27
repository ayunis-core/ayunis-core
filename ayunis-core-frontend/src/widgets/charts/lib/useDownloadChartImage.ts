import { useCallback, useRef, useState } from 'react';
import { toPng } from 'html-to-image';

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
      });

      const link = document.createElement('a');
      link.download = `${slugify(title ?? 'chart')}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsDownloading(false);
    }
  }, [title]);

  return { chartRef, download, isDownloading };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
