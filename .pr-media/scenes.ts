import type { Page } from '@playwright/test';
import type { PrMediaScene } from './types';

async function createWorkspace(page: Page) {
  const response = await page.request.post('/api/workspaces', {
    data: {
      name: `PR Media Workspace ${Date.now()}`,
      description: 'Independent workspace resources',
      icon: 'library',
    },
  });
  if (!response.ok()) throw new Error(`Workspace creation failed: ${response.status()}`);
  const workspace = (await response.json()) as { id: string };
  await page.goto(`/workspaces/${workspace.id}`);
  await page.getByTestId('workspace-page').waitFor();
}

export default [
  {
    name: 'workspace-owned-skills',
    path: '/workspaces',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      await createWorkspace(page);
      await page.getByTestId('workspace-tab-skills').click();
      return page.getByTestId('workspace-skills-add').first();
    },
    demos: [
      {
        name: 'create-skill-dialog',
        action: async ({ page }) => {
          await page
            .getByRole('button', { name: 'Fähigkeit erstellen' })
            .first()
            .click();
          await page.getByRole('dialog').waitFor();
        },
      },
    ],
  },
  {
    name: 'workspace-owned-knowledge',
    path: '/workspaces',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      await createWorkspace(page);
      await page.getByTestId('workspace-tab-knowledge').click();
      return page.getByTestId('workspace-knowledge-add').first();
    },
  },
] satisfies PrMediaScene[];
