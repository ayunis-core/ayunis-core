import { test as base, expect, request as apiRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import path from 'node:path';
import { config } from '../config';
import { MailcatcherClient } from '../clients/mailcatcher.client';
import { createOrg } from '../factories/org.factory';
import type { OrgContext } from '../factories/org.factory';

interface TestFixtures {
  // Authenticated API context for the worker org's admin — use for test
  // setup and side-effect assertions, not for the behaviour under test.
  api: APIRequestContext;
  publicApi: APIRequestContext;
  // Mailcatcher client for awaiting emails and extracting link tokens.
  mail: MailcatcherClient;
  // Opt-out for the page-error guard: test.use({ allowPageErrors: true }).
  allowPageErrors: boolean;
  pageErrorGuard: void;
}

interface WorkerFixtures {
  // Each worker gets its own org (admin + trial + default model), created
  // once via the API. Tests within a worker share it; workers never collide.
  org: OrgContext;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  org: [
    async ({}, use, workerInfo) => {
      const storageStatePath = path.join(
        workerInfo.project.outputDir,
        `.auth-worker-${workerInfo.workerIndex}.json`,
      );
      const uniqueKey = `w${workerInfo.workerIndex}-${Date.now()}`;
      await use(await createOrg(uniqueKey, storageStatePath));
    },
    { scope: 'worker' },
  ],

  // All pages start authenticated as the worker org's admin. Specs that
  // exercise login itself opt out via
  // test.use({ storageState: { cookies: [], origins: [] } }).
  storageState: ({ org }, use) => use(org.storageState),

  api: async ({ org }, use) => {
    const context = await apiRequest.newContext({
      baseURL: config.apiURL,
      storageState: org.storageState,
    });
    await use(context);
    await context.dispose();
  },

  publicApi: async ({}, use) => {
    const context = await apiRequest.newContext({ baseURL: config.apiURL });
    await use(context);
    await context.dispose();
  },

  mail: async ({}, use) => {
    const context = await apiRequest.newContext();
    await use(new MailcatcherClient(context, config.mailURL));
    await context.dispose();
  },

  allowPageErrors: [false, { option: true }],

  // Fails any test whose page throws an uncaught error, so client-side
  // crashes surface even when the asserted-on element still renders.
  pageErrorGuard: [
    async ({ page, allowPageErrors }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await use();
      if (!allowPageErrors) {
        expect(errors, 'uncaught page errors').toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };
