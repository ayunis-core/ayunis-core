import type { PrMediaScene } from './types';

export default [
  {
    name: 'project-sharing',
    path: '/workspaces',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) =>
      page.getByRole('link', { name: 'Bürgeranfragen', exact: true }),
    demos: [
      {
        name: 'open-sharing-dialog',
        action: async ({ page, expect }) => {
          await page
            .getByRole('link', { name: 'Bürgeranfragen', exact: true })
            .click();
          await expect(page.getByTestId('workspace-page')).toBeVisible();
          await page.getByTestId('workspace-sharing-open').click();
          await expect(
            page.getByTestId('workspace-sharing-recipient'),
          ).toBeVisible();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
