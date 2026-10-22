import {
  expect,
  request,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import type { PrMediaScene } from './types';
import { delay } from './lib/delay';
import { config } from '../src/config';
import { MailcatcherClient } from '../src/clients/mailcatcher.client';
import { createSignedInMember } from '../src/factories/user.factory';
import { setRolePermissions } from '../src/clients/api/role-permissions.client';

const USER_DEFAULTS = [
  'manage_own_skills',
  'install_marketplace_skills',
  'request_skill_transfer',
  'request_skill_transfer_org',
  'manage_own_knowledge',
  'request_knowledge_transfer',
  'request_knowledge_transfer_org',
  'create_workspaces',
  'share_workspaces',
] as const;

async function renameMe(api: APIRequestContext, name: string) {
  const response = await api.patch(`${config.apiURL}/api/users/name`, {
    data: { name },
  });
  expect(response.ok()).toBe(true);
}

async function asAdmin<T>(
  page: Page,
  work: (api: APIRequestContext) => Promise<T>,
): Promise<T> {
  const api = await request.newContext({
    baseURL: config.apiURL,
    storageState: await page.context().storageState(),
  });
  try {
    return await work(api);
  } finally {
    await api.dispose();
  }
}

async function prepareAdmin(page: Page, userPermissions: readonly string[]) {
  await asAdmin(page, async (api) => {
    await renameMe(api, 'Sabine Keller');
    await setRolePermissions(api, 'user', [...userPermissions] as never);
  });
}

async function switchToNewMember(page: Page, name: string): Promise<void> {
  const member = await asAdmin(page, async (api) => {
    const mailContext = await request.newContext();
    try {
      return await createSignedInMember(
        api,
        new MailcatcherClient(mailContext, config.mailURL),
        `media-${Date.now()}`,
      );
    } finally {
      await mailContext.dispose();
    }
  });
  await renameMe(member.api, name);
  await page.context().clearCookies();
  await page.context().addCookies(member.storageState.cookies);
  await member.api.dispose();
}

export default [
  {
    name: 'roles-overview',
    path: '/admin-settings/roles',
    viewports: ['desktop'],
    waitFor: async ({ page }) => {
      await prepareAdmin(page, USER_DEFAULTS);
      await page.reload();
      return page.getByTestId('roles-overview');
    },
  },
  {
    name: 'roles-permissions',
    path: '/admin-settings/roles',
    viewports: ['desktop'],
    waitFor: async ({ page }) => {
      await prepareAdmin(page, USER_DEFAULTS);
      await page.reload();
      const firstRow = page.getByTestId('permission-row-manage_teams');
      await firstRow.evaluate((row) => {
        const card = row.closest('[data-slot="card"]') ?? row;
        card.scrollIntoView({ block: 'start' });
        let scroller = card.parentElement;
        while (scroller && scroller.scrollHeight <= scroller.clientHeight) {
          scroller = scroller.parentElement;
        }
        scroller?.scrollBy(0, -72);
      });
      return firstRow;
    },
    demos: [
      {
        name: 'hint-and-save',
        action: async ({ page }) => {
          await page
            .getByTestId('permission-hint-install_marketplace_skills')
            .hover();
          await expect(page.getByRole('tooltip')).toBeVisible();
          await delay(1800);
          await page.mouse.move(0, 0);
          await page
            .getByTestId('permission-row-create_workspaces')
            .getByRole('checkbox')
            .first()
            .click();
          await delay(900);
          await page.getByTestId('roles-save').click();
          await expect(page.getByTestId('roles-save')).toBeDisabled();
          await delay(1600);
        },
      },
    ],
  },
  {
    name: 'member-without-create-right',
    path: '/workspaces',
    viewports: ['desktop'],
    waitFor: async ({ page }) => {
      await prepareAdmin(
        page,
        USER_DEFAULTS.filter((key) => key !== 'create_workspaces'),
      );
      await switchToNewMember(page, 'Lena Hoffmann');
      await page.goto('/workspaces');
      return page.getByTestId('workspaces-empty-no-create');
    },
  },
] satisfies PrMediaScene[];
