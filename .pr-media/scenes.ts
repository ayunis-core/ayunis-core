import type { Page } from '@playwright/test';
import type { PrMediaScene } from './types';

const workspaceName = 'PR Media Empty Chats';
const contextWorkspaceName = 'PR Media Context Tabs';

async function openWorkspaceDetail(
  page: Page,
  name: string,
): Promise<void> {
  const response = await page.request.post('/api/workspaces', {
    data: { name },
  });
  if (!response.ok()) {
    throw new Error(
      `POST /api/workspaces failed: ${response.status()} ${await response.text()}`,
    );
  }
  const workspace = (await response.json()) as { id: string };
  await page.goto(`/workspaces/${workspace.id}`);
}

export default [
  {
    name: 'workspace-empty-chats',
    path: '/chat',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      await openWorkspaceDetail(page, workspaceName);

      return page.getByTestId('workspace-chats-empty');
    },
  },
  {
    name: 'workspace-context-tabs-without-search',
    path: '/chat',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      await openWorkspaceDetail(page, contextWorkspaceName);
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
