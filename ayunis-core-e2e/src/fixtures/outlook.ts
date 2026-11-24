import type { Response } from '@playwright/test';
import { config } from '../config';
import { expect, test as base } from './test';

const apiOrigin = new URL(config.apiURL).origin;

export const test = base.extend<{ outlookApiGuard: void }>({
  outlookApiGuard: [
    async ({ context }, use) => {
      const forbidden: string[] = [];
      const recordForbidden = (response: Response): void => {
        if (response.status() !== 403) return;
        const { origin, pathname } = new URL(response.url());
        if (origin === apiOrigin && pathname.startsWith('/api/')) {
          forbidden.push(`${response.request().method()} ${pathname}`);
        }
      };
      context.on('response', recordForbidden);
      await use();
      context.off('response', recordForbidden);
      expect(forbidden, 'forbidden API responses in Outlook').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
