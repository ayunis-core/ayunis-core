import type { Page } from '@playwright/test';
import type { PrMediaScene } from './types';

async function recordingNamed(
  page: Page,
  name: string,
  owner: Record<string, string>,
): Promise<string> {
  const list = await page.request.get('/api/recordings', {
    params: { ownerType: 'personal' },
  });
  const existing = ((await list.json()) as { data: { id: string; name: string }[] }).data.find(
    (recording) => recording.name === name,
  );
  if (existing) return existing.id;
  const created = await page.request.post('/api/recordings', {
    data: { ...owner, name },
  });
  return ((await created.json()) as { id: string }).id;
}

async function seedList(page: Page): Promise<void> {
  await recordingNamed(page, 'Bauausschuss 12. November', { ownerType: 'personal' });
  await recordingNamed(page, 'Gemeinderat 4. November', { ownerType: 'org' });
  await recordingNamed(page, 'Haushaltsklausur', { ownerType: 'org' });
}

export default [
  {
    name: 'recordings-list',
    path: '/recordings',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      await seedList(page);
      await page.reload();
      return page.getByTestId('recordings-section-org');
    },
    demos: [
      {
        name: 'create-with-owner',
        action: async ({ page }) => {
          await page.getByTestId('recording-create').first().click();
          await page.getByTestId('entity-form-name').fill('Ortsbeirat Mitte');
          await page.getByTestId('recording-create-owner').click();
          await page.getByTestId('recording-create-owner-option-org').click();
        },
      },
    ],
  },
  {
    name: 'recording-detail',
    path: '/recordings',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      const id = await recordingNamed(page, 'Bauausschuss 12. November', {
        ownerType: 'personal',
      });
      await page.goto(`/recordings/${id}`);
      return page.getByTestId('recording-properties-card');
    },
  },
  {
    name: 'roles-settings-recordings',
    path: '/admin-settings/roles',
    viewports: ['desktop'],
    waitFor: async ({ page }) =>
      page.getByRole('checkbox', { name: 'manage_recordings-user' }),
  },
  {
    name: 'workspace-recordings-tab',
    path: '/workspaces',
    viewports: ['desktop'],
    waitFor: async ({ page }) => {
      const workspace = await page.request.post('/api/workspaces', {
        data: { name: 'Stadtentwicklung', icon: 'building-2' },
      });
      const { id } = (await workspace.json()) as { id: string };
      await page.request.post('/api/recordings', {
        data: {
          ownerType: 'workspace',
          workspaceId: id,
          name: 'Workshop Innenstadt',
        },
      });
      await page.goto(`/workspaces/${id}?tab=recordings`);
      return page.getByTestId('workspace-tab-recordings');
    },
  },
] satisfies PrMediaScene[];
