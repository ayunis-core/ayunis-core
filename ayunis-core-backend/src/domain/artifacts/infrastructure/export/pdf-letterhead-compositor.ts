import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, PDFEmbeddedPage, PDFPage, degrees } from 'pdf-lib';

/**
 * Composites content PDF pages onto letterhead background PDFs.
 *
 * For each content page, the corresponding background page is placed first,
 * then the content page is overlaid on top. Page 1 uses the first-page
 * background; pages 2+ use the continuation-page background (if provided).
 */
@Injectable()
export class PdfLetterheadCompositor {
  private readonly logger = new Logger(PdfLetterheadCompositor.name);

  /**
   * Composite content pages onto letterhead backgrounds.
   *
   * @param contentPdf   The rendered content PDF buffer
   * @param firstPagePdf Single-page PDF used as background for page 1
   * @param continuationPagePdf Optional single-page PDF for pages 2+
   * @returns Composited PDF buffer
   */
  async composite(
    contentPdf: Buffer,
    firstPagePdf: Buffer,
    continuationPagePdf?: Buffer,
  ): Promise<Buffer> {
    this.logger.log('Compositing PDF with letterhead background');

    const contentDoc = await PDFDocument.load(contentPdf);
    const firstBgDoc = await PDFDocument.load(firstPagePdf);
    const continuationBgDoc = continuationPagePdf
      ? await PDFDocument.load(continuationPagePdf)
      : null;

    const outputDoc = await PDFDocument.create();
    const contentPageCount = contentDoc.getPageCount();

    const firstBg = await this.embedBackground(outputDoc, firstBgDoc);
    const continuationBg = continuationBgDoc
      ? await this.embedBackground(outputDoc, continuationBgDoc)
      : null;

    for (let i = 0; i < contentPageCount; i++) {
      const isFirstPage = i === 0;
      const background = isFirstPage ? firstBg : (continuationBg ?? firstBg);

      const contentPage = contentDoc.getPage(i);
      const { width, height } = contentPage.getSize();

      const outputPage = outputDoc.addPage([width, height]);
      drawBackground(outputPage, background);

      const [embeddedContent] = await outputDoc.embedPdf(contentDoc, [i]);
      outputPage.drawPage(embeddedContent, { x: 0, y: 0, width, height });
    }

    const outputBytes = await outputDoc.save();
    this.logger.log(
      { pageCount: contentPageCount },
      'Composited PDF with letterhead background',
    );
    return Buffer.from(outputBytes);
  }

  private async embedBackground(
    outputDoc: PDFDocument,
    backgroundDoc: PDFDocument,
  ): Promise<Background> {
    const [page] = await outputDoc.embedPdf(backgroundDoc, [0]);
    const rotation = backgroundDoc.getPage(0).getRotation().angle;
    return { page, rotation: ((rotation % 360) + 360) % 360 };
  }
}

interface Background {
  page: PDFEmbeddedPage;
  /** The source page's /Rotate, normalized to 0, 90, 180 or 270. */
  rotation: number;
}

/**
 * `embedPdf` ignores the source page's /Rotate, so a letterhead saved as a
 * landscape MediaBox rotated to portrait would be drawn sideways. Undo the
 * clockwise /Rotate by drawing counter-rotated around the matching corner.
 */
function drawBackground(target: PDFPage, { page, rotation }: Background) {
  const { width, height } = target.getSize();
  const placements: Record<number, { x: number; y: number }> = {
    0: { x: 0, y: 0 },
    90: { x: 0, y: height },
    180: { x: width, y: height },
    270: { x: width, y: 0 },
  };
  const isQuarterTurn = rotation % 180 !== 0;
  target.drawPage(page, {
    ...placements[rotation],
    width: isQuarterTurn ? height : width,
    height: isQuarterTurn ? width : height,
    rotate: degrees(-rotation),
  });
}
