import type { PrMediaScene, PrMediaContext } from './types';

const projectName = 'Projektfreigabe Demo';

async function ensureProject({ page }: PrMediaContext) {
  const projectLink = page.getByRole('main').getByRole('link', {
    name: projectName,
    exact: true,
  });
  if ((await projectLink.count()) === 0) {
    await page
      .getByRole('button', { name: /Neues Projekt|New project/ })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('textbox', {
        name: /Woran arbeiten Sie|What are you working on/,
      })
      .fill(projectName);
    await dialog
      .getByRole('button', { name: /Projekt erstellen|Create project/ })
      .click();
  }
  return projectLink;
}

export default [
  {
    name: 'project-sharing',
    path: '/workspaces',
    viewports: ['desktop', 'mobile'],
    waitFor: ensureProject,
    demos: [
      {
        name: 'open-sharing-dialog',
        action: async (context) => {
          const { page, expect } = context;
          await (await ensureProject(context)).click();
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
