import type { Locator, Page } from '@playwright/test';
import type { Expect } from '@playwright/test';

export const PR_MEDIA_VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 375, height: 812 },
} as const;

export type PrMediaViewport = keyof typeof PR_MEDIA_VIEWPORTS;

export type PrMediaContext = {
  page: Page;
  expect: Expect;
  viewport: PrMediaViewport;
};

export type PrMediaDemo = {
  name: string;
  action: (context: PrMediaContext) => Promise<void>;
};

export type PrMediaScene = {
  name: string;
  path: string;
  viewports?: PrMediaViewport[];
  waitFor?: (context: PrMediaContext) => Promise<Locator | void>;
  demos?: PrMediaDemo[];
};
