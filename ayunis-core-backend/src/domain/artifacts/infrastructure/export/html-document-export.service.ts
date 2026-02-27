import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DocumentExportPort } from '../../application/ports/document-export.port';
import { convertHtmlToDocx } from './html-to-docx-converter';
import puppeteer, { Browser } from 'puppeteer-core';
import { existsSync } from 'fs';
import { sanitizeHtmlContent } from '../../domain/sanitize-html-content';

/** CSS for PDF export (Puppeteer supports full <style> blocks). */
const PDF_CSS = `
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
  blockquote {
    border-left: 3pt solid #ccc;
    padding-left: 12pt;
    margin: 0 0 8pt 0;
    color: #555;
  }
  pre {
    background-color: #f5f5f5;
    padding: 8pt;
    border-radius: 4pt;
    margin-bottom: 8pt;
    font-family: monospace;
    font-size: 10pt;
    overflow-x: auto;
  }
  code { font-family: monospace; font-size: 10pt; }
  ul, ol { margin-bottom: 8pt; padding-left: 24pt; }
  li { margin-bottom: 4pt; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; }
  th, td { border: 1px solid #ccc; padding: 6pt 8pt; text-align: left; }
  th { background-color: #f5f5f5; font-weight: bold; }
  a { color: #1a73e8; }
`;

@Injectable()
export class HtmlDocumentExportService
  implements DocumentExportPort, OnModuleDestroy
{
  private readonly logger = new Logger(HtmlDocumentExportService.name);
  private browser: Browser | null = null;
  private launchPromise: Promise<void> | null = null;

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  async exportToDocx(html: string): Promise<Buffer> {
    this.logger.log('Exporting HTML to DOCX');

    const sanitized = sanitizeHtmlContent(html);
    return convertHtmlToDocx(sanitized);
  }

  async exportToPdf(html: string): Promise<Buffer> {
    this.logger.log('Exporting HTML to PDF');

    const wrappedHtml = this.wrapHtmlForPdf(html);
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

    if (!this.launchPromise) {
      this.logger.log('Launching Puppeteer browser (lazy init)');
      this.launchPromise = this.launchBrowser().finally(() => {
        this.launchPromise = null;
      });
    }
    await this.launchPromise;
    return this.browser!;
  }

  private async launchBrowser(): Promise<void> {
    const executablePath = this.resolveChromePath();
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.logger.log(`Puppeteer browser launched (${executablePath})`);
  }

  private resolveChromePath(): string {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const candidates = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(
      'No Chrome/Chromium executable found. Set PUPPETEER_EXECUTABLE_PATH.',
    );
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Puppeteer browser closed');
    }
  }

  private wrapHtmlForPdf(unsafeHtml: string): string {
    const html = sanitizeHtmlContent(unsafeHtml);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${PDF_CSS}</style>
</head>
<body>${html}</body>
</html>`;
  }
}
