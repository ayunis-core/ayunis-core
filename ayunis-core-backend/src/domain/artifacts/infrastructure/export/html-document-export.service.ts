import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DocumentExportPort } from '../../application/ports/document-export.port';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import htmlToDocx = require('html-to-docx');
import puppeteer, { Browser } from 'puppeteer-core';
import { sanitizeHtmlContent } from '../../domain/sanitize-html-content';

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

    const wrappedHtml = this.wrapHtmlForDocx(html);
    const buffer = await htmlToDocx(wrappedHtml, null, {
      font: 'Arial',
      fontSize: '12pt',
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      margins: {
        top: 1440,
        right: 1440,
        bottom: 1440,
        left: 1440,
      },
    });

    return Buffer.from(buffer);
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

    // Common Chrome/Chromium paths for local development
    const candidates = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
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

  /**
   * Wraps HTML for DOCX export using inline styles.
   *
   * html-to-docx ignores `<style>` blocks, so all styling must be inline.
   * Document-level formatting (font, fontSize, margins) is set via
   * html-to-docx API options in exportToDocx().
   */
  private wrapHtmlForDocx(unsafeHtml: string): string {
    const html = sanitizeHtmlContent(unsafeHtml);
    return this.applyInlineStyles(html);
  }

  /**
   * Wraps HTML for PDF export with a `<style>` block.
   *
   * Puppeteer fully supports CSS `<style>` blocks.
   */
  private wrapHtmlForPdf(unsafeHtml: string): string {
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

  /**
   * Wraps HTML content with inline styles for DOCX compatibility.
   */
  private applyInlineStyles(html: string): string {
    const styledHtml = html
      .replace(/<h1(?=[\s>])/g, '<h1 style="font-size:20pt;margin-bottom:12pt"')
      .replace(/<h2(?=[\s>])/g, '<h2 style="font-size:16pt;margin-bottom:10pt"')
      .replace(/<h3(?=[\s>])/g, '<h3 style="font-size:14pt;margin-bottom:8pt"')
      .replace(/<p(?=[\s>])/g, '<p style="margin-bottom:8pt"')
      .replace(
        /<ul(?=[\s>])/g,
        '<ul style="margin-bottom:8pt;padding-left:24pt"',
      )
      .replace(
        /<ol(?=[\s>])/g,
        '<ol style="margin-bottom:8pt;padding-left:24pt"',
      )
      .replace(
        /<table(?=[\s>])/g,
        '<table style="border-collapse:collapse;width:100%;margin-bottom:12pt"',
      )
      .replace(
        /<th(?=[\s>])/g,
        '<th style="border:1px solid #ccc;padding:6pt 8pt;text-align:left;background-color:#f5f5f5;font-weight:bold"',
      )
      .replace(
        /<td(?=[\s>])/g,
        '<td style="border:1px solid #ccc;padding:6pt 8pt;text-align:left"',
      )
      .replace(/<a(?=[\s>])/g, '<a style="color:#1a73e8"');

    const mergedHtml = this.mergeDuplicateStyles(styledHtml);

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.6;color:#333">${mergedHtml}</body>
</html>`;
  }

  /**
   * Merges duplicate `style` attributes on the same tag into one.
   *
   * When applyInlineStyles adds a style to a tag that already has one,
   * the result is two style attributes. This method combines them.
   */
  private mergeDuplicateStyles(html: string): string {
    return html.replace(
      /style="([^"]*)"\s+style="([^"]*)"/g,
      (_, first: string, second: string) => {
        const merged = first.replace(/;$/, '') + ';' + second;
        return `style="${merged}"`;
      },
    );
  }
}
