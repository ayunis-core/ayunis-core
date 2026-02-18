import { Injectable, Logger } from '@nestjs/common';
import { DocumentExportPort } from '../../application/ports/document-export.port';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import htmlToDocx = require('html-to-docx');
import puppeteer from 'puppeteer';

@Injectable()
export class HtmlDocumentExportService implements DocumentExportPort {
  private readonly logger = new Logger(HtmlDocumentExportService.name);

  async exportToDocx(html: string): Promise<Buffer> {
    this.logger.log('Exporting HTML to DOCX');

    const wrappedHtml = this.wrapHtml(html);
    const buffer = await htmlToDocx(wrappedHtml, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    return Buffer.from(buffer);
  }

  async exportToPdf(html: string): Promise<Buffer> {
    this.logger.log('Exporting HTML to PDF');

    const wrappedHtml = this.wrapHtml(html);
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(wrappedHtml, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private wrapHtml(html: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
    }
    h1 { font-size: 20pt; margin-bottom: 12pt; }
    h2 { font-size: 16pt; margin-bottom: 10pt; }
    h3 { font-size: 14pt; margin-bottom: 8pt; }
    p { margin-bottom: 8pt; }
    ul, ol { margin-bottom: 8pt; padding-left: 24pt; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; }
    th, td { border: 1px solid #ccc; padding: 6pt 8pt; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    a { color: #1a73e8; }
  </style>
</head>
<body>${html}</body>
</html>`;
  }
}
