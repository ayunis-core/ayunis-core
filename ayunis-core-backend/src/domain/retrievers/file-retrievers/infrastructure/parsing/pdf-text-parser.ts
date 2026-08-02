import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js';

interface PositionedTextItem {
  str?: string;
  transform?: number[];
}

/**
 * Page count via pdf-lib metadata only — no text rendering.
 */
export async function countPdfPages(buffer: Buffer): Promise<number> {
  const document = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  return document.getPageCount();
}

/**
 * Extracts the native text layer of every page (one entry per page; blank or
 * image-only pages yield '' — both are OCR candidates). Items on one baseline
 * are joined, a baseline change inserts a newline.
 */
export async function extractPdfPageTexts(buffer: Buffer): Promise<string[]> {
  const document = await getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
  }).promise;

  try {
    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      pageTexts.push(joinTextItems(textContent.items as PositionedTextItem[]));
      page.cleanup();
    }
    return pageTexts;
  } finally {
    await document.destroy();
  }
}

function joinTextItems(items: PositionedTextItem[]): string {
  let lastY: number | undefined;
  let text = '';
  for (const item of items) {
    if (item.str === undefined) {
      continue;
    }
    const y = item.transform?.[5];
    if (lastY === undefined || lastY === y) {
      text += item.str;
    } else {
      text += `\n${item.str}`;
    }
    lastY = y;
  }
  return text;
}
