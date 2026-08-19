import type { PrMediaScene } from './types';

const workspaceName = 'PR Media Empty Chats';
const contextWorkspaceName = 'PR Media Context Tabs';

export default [
  {
    name: 'workspace-empty-chats',
    path: '/workspaces',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page, expect }) => {
      await page.getByRole('button', { name: 'Neues Projekt' }).click();
      await page
        .getByRole('textbox', { name: 'Woran arbeiten Sie?' })
        .fill(workspaceName);
      await page
        .getByRole('button', { name: 'Projekt erstellen' })
        .click();

      const workspace = page.getByRole('link', { name: workspaceName }).last();
      await expect(workspace).toBeVisible();
      await workspace.click();

      return page.getByTestId('workspace-chats-empty');
    },
  },
  {
    name: 'workspace-context-tabs-without-search',
    path: '/workspaces',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page, expect }) => {
      await page.getByRole('button', { name: 'Neues Projekt' }).click();
      await page
        .getByRole('textbox', { name: 'Woran arbeiten Sie?' })
        .fill(contextWorkspaceName);
      await page
        .getByRole('button', { name: 'Projekt erstellen' })
        .click();

      const workspace = page
        .getByRole('link', { name: contextWorkspaceName })
        .last();
      await expect(workspace).toBeVisible();
      await workspace.click();
      await page.getByTestId('workspace-tab-skills').click();

      return page.getByTestId('workspace-skills-add');
    },
    demos: [
      {
        name: 'open-add-dialog',
        action: async ({ page, expect }) => {
          await page.getByTestId('workspace-skills-add').click();
          await expect(page.getByTestId('workspace-add-dialog')).toBeVisible();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
