import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DocumentExportPort } from '../../application/ports/document-export.port';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import htmlToDocx = require('html-to-docx');
import puppeteer, { Browser } from 'puppeteer';
import { sanitizeHtmlContent } from '../../domain/sanitize-html-content';

@Injectable()
export class HtmlDocumentExportService
  implements DocumentExportPort, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(HtmlDocumentExportService.name);
  private browser: Browser | null = null;
  private launchPromise: Promise<void> | null = null;

  async onModuleInit(): Promise<void> {
    await this.launchBrowser();
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

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
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(wrappedHtml, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }

    this.logger.warn('Browser disconnected — relaunching');
    if (!this.launchPromise) {
      this.launchPromise = this.launchBrowser().finally(() => {
        this.launchPromise = null;
      });
    }
    await this.launchPromise;
    return this.browser!;
  }

  private async launchBrowser(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.logger.log('Puppeteer browser launched');
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Puppeteer browser closed');
    }
  }

  /**
   * Wraps HTML content in a full document with styles for export.
   *
   * Re-sanitization here is intentional defense-in-depth: content stored
   * before the sanitization fix may contain unsanitized HTML, so we
   * sanitize at the export boundary regardless of upstream guarantees.
   */
  private wrapHtml(unsafeHtml: string): string {
    const html = sanitizeHtmlContent(unsafeHtml);
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
