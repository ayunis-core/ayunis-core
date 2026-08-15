import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { LazyChromiumBrowser } from 'src/common/puppeteer/lazy-chromium-browser';
import {
  CertificateRendererPort,
  CertificateRenderInput,
} from '../../application/ports/certificate-renderer.port';
import { buildCertificateHtml } from './certificate-template';

@Injectable()
export class PuppeteerCertificateRendererService
  implements CertificateRendererPort, OnModuleDestroy
{
  constructor(
    @InjectPinoLogger(PuppeteerCertificateRendererService.name)
    private readonly logger: PinoLogger,
  ) {}

  private readonly chromium = new LazyChromiumBrowser();

  async onModuleDestroy(): Promise<void> {
    await this.chromium.close();
  }

  async render(input: CertificateRenderInput): Promise<Buffer> {
    this.logger.info('Rendering academy certificate PDF');

    const html = buildCertificateHtml(input);
    const browser = await this.chromium.get();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        // `preferCSSPageSize` makes Chromium honor the explicit `@page` A4
        // size in the template instead of its locale-dependent default.
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }
}
