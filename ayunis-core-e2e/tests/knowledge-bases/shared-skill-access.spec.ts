import type { BrowserContext, Page } from '@playwright/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createSharedSkillAccessFixture } from '../../src/factories/shared-skill-access.factory';
import { test, expect } from '../../src/fixtures/test';

test('shows a knowledge base linked to a skill shared with another user', async ({
  api,
  browser,
  mail,
}) => {
  const fixture = await createSharedSkillAccessFixture(
    api,
    mail,
    `${Date.now()}`,
  );
  let memberContext: BrowserContext | undefined;
  let memberPage: Page | undefined;
  const pageErrors: string[] = [];

  try {
    memberContext = await browser.newContext({
      storageState: await fixture.memberApi.storageState(),
    });
    memberPage = await memberContext.newPage();
    memberPage.on('pageerror', (error) => pageErrors.push(error.message));

    const knowledgeBasesBeforeShare =
      await generatedApi.knowledgeBasesControllerFindAll({
        api: fixture.memberApi,
      });
    expect(knowledgeBasesBeforeShare.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: fixture.knowledgeBase.id }),
      ]),
    );

    await fixture.shareSkill();

    const knowledgeBases =
      await generatedApi.knowledgeBasesControllerFindAll({
        api: fixture.memberApi,
      });
    expect(knowledgeBases.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: fixture.knowledgeBase.id,
          isShared: true,
        }),
      ]),
    );

    await memberPage.goto('/knowledge-bases');
    await memberPage.getByTestId('knowledge-base-tab-shared').click();
    await expect(
      memberPage.getByTestId(`knowledge-base-card-${fixture.knowledgeBase.id}`),
    ).toBeVisible();
    await expect(
      memberPage.getByTestId(
        `knowledge-base-shared-badge-${fixture.knowledgeBase.id}`,
      ),
    ).toBeVisible();

    await memberPage.goto(`/workspaces/${fixture.workspace.id}`);
    await expect(memberPage.getByTestId('workspace-page')).toBeVisible();
    await memberPage.getByTestId('workspace-tab-knowledge').click();
    await expect(
      memberPage.getByTestId('workspace-knowledge-add').first(),
    ).toBeVisible();
    await memberPage.getByTestId('workspace-knowledge-add').first().click();
    await expect(
      memberPage.getByTestId(
        `workspace-add-dialog-item-${fixture.knowledgeBase.id}`,
      ),
    ).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  } finally {
    await memberPage?.close();
    await memberContext?.close();
    await fixture.memberApi.dispose();
  }
});
