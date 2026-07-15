import { Logger } from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer-core';
import { existsSync } from 'fs';

/**
 * Lazily launched, shared headless-Chromium instance for PDF rendering.
 * The browser is started on first use and reused until `close()` is called
 * (typically from the owning service's `onModuleDestroy`).
 */
export class LazyChromiumBrowser {
  private readonly logger = new Logger(LazyChromiumBrowser.name);
  private browser: Browser | null = null;
  private launchPromise: Promise<void> | null = null;

  async get(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }

    if (!this.launchPromise) {
      this.logger.log('Launching Puppeteer browser (lazy init)');
      this.launchPromise = this.launch().finally(() => {
        this.launchPromise = null;
      });
    }
    await this.launchPromise;
    return this.browser!;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Puppeteer browser closed');
    }
  }

  private async launch(): Promise<void> {
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
}
