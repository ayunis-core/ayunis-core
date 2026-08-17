import type { Page } from '@playwright/test';

export type DemoScene = {
  name: string;
  action: (page: Page) => Promise<void>;
};
