import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PDFDocument } from 'pdf-lib';

/**
 * Composites content PDF pages onto letterhead background PDFs.
 *
 * For each content page, the corresponding background page is placed first,
 * then the content page is overlaid on top. Page 1 uses the first-page
 * background; pages 2+ use the continuation-page background (if provided).
 */
@Injectable()
export class PdfLetterheadCompositor {
  constructor(
    @InjectPinoLogger(PdfLetterheadCompositor.name)
    private readonly logger: PinoLogger,
  ) {}

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
    this.logger.info('Compositing PDF with letterhead background');

    const contentDoc = await PDFDocument.load(contentPdf);
    const firstBgDoc = await PDFDocument.load(firstPagePdf);
    const continuationBgDoc = continuationPagePdf
      ? await PDFDocument.load(continuationPagePdf)
      : null;

    const outputDoc = await PDFDocument.create();
    const contentPageCount = contentDoc.getPageCount();

    const [embeddedFirstBg] = await outputDoc.embedPdf(firstBgDoc, [0]);
    const embeddedContinuationBg = continuationBgDoc
      ? (await outputDoc.embedPdf(continuationBgDoc, [0]))[0]
      : null;

    for (let i = 0; i < contentPageCount; i++) {
      const isFirstPage = i === 0;
      const embeddedBg = isFirstPage
        ? embeddedFirstBg
        : (embeddedContinuationBg ?? embeddedFirstBg);

      const contentPage = contentDoc.getPage(i);
      const { width, height } = contentPage.getSize();

      const outputPage = outputDoc.addPage([width, height]);
      outputPage.drawPage(embeddedBg, { x: 0, y: 0, width, height });

      const [embeddedContent] = await outputDoc.embedPdf(contentDoc, [i]);
      outputPage.drawPage(embeddedContent, { x: 0, y: 0, width, height });
    }

    const outputBytes = await outputDoc.save();
    this.logger.info(
      { pageCount: contentPageCount },
      'Composited PDF with letterhead background',
    );
    return Buffer.from(outputBytes);
  }
}
