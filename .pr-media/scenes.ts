import type { PrMediaScene } from './types';

const workspaceName = 'PR Media Empty Chats';

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
] satisfies PrMediaScene[];
