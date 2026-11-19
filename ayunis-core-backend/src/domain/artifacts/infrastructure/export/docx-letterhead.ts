import { dirname, join, sep } from 'node:path';
import type { LetterheadConfig } from 'src/domain/artifacts/application/ports/document-export.port';

const MAX_RASTER_EDGE = 2400;
const MAX_IMAGE_PIXELS = 24_000_000;
export const A4_PAGE_MM = { width: 210, height: 297 } as const;

export interface DocxLetterhead {
  firstPagePng: Buffer;
  continuationPagePng?: Buffer;
  margins: LetterheadConfig['firstPageMargins'];
}

export async function renderDocxLetterhead(
  letterhead: LetterheadConfig,
): Promise<DocxLetterhead> {
  const margins = wordPageMargins(letterhead);
  const firstPagePng = await renderBackground(letterhead.firstPagePdf);
  const continuationPagePng = letterhead.continuationPagePdf
    ? await renderBackground(letterhead.continuationPagePdf)
    : undefined;
  return {
    firstPagePng,
    continuationPagePng,
    margins,
  };
}

function wordPageMargins({
  firstPageMargins: first,
  continuationPageMargins: continuation,
}: LetterheadConfig): DocxLetterhead['margins'] {
  // A Word section has one set of margins even when its first header differs.
  const margins = {
    top: Math.max(first.top, continuation.top),
    right: Math.max(first.right, continuation.right),
    bottom: Math.max(first.bottom, continuation.bottom),
    left: Math.max(first.left, continuation.left),
  };
  if (
    margins.left + margins.right >= A4_PAGE_MM.width ||
    margins.top + margins.bottom >= A4_PAGE_MM.height
  ) {
    throw new RangeError('Combined letterhead margins leave no Word body area');
  }
  return margins;
}

async function renderBackground(pdf: Buffer): Promise<Buffer> {
  const { getDocument, VerbosityLevel } =
    await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createCanvas } = await import('@napi-rs/canvas');
  const assets = dirname(require.resolve('pdfjs-dist/package.json'));
  const loadingTask = getDocument({
    data: Uint8Array.from(pdf),
    cMapUrl: join(assets, 'cmaps') + sep,
    standardFontDataUrl: join(assets, 'standard_fonts') + sep,
    wasmUrl: join(assets, 'wasm') + sep,
    useWorkerFetch: false,
    maxImageSize: MAX_IMAGE_PIXELS,
    stopAtErrors: true,
    verbosity: VerbosityLevel.ERRORS,
  });

  try {
    const document = await loadingTask.promise;
    const page = await document.getPage(1);
    const dimensions = page.getViewport({ scale: 1 });
    const scale =
      MAX_RASTER_EDGE / Math.max(dimensions.width, dimensions.height);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(
      Math.max(1, Math.ceil(viewport.width)),
      Math.max(1, Math.ceil(viewport.height)),
    );
    await page.render({
      // PDF.js supports the native canvas in Node but types its render API for DOM canvases.
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
    }).promise;
    return await canvas.encode('png');
  } finally {
    await loadingTask.destroy();
  }
}
