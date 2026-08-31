import { generatedApi } from '../../src/clients/api/generated-api';
import { test, expect } from '../../src/fixtures/test';
import { startThread } from '../../src/flows/chat.flow';

test('creates knowledge bases active and lets the user toggle their chat availability', async ({
  api,
  page,
}) => {
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    {
      name: `Active regulations ${Date.now()}`,
      description: 'Regulations that should be available in every chat',
    },
    { api },
  );

  try {
    expect(knowledgeBase.isActive).toBe(true);
    await page.goto('/knowledge-bases');

    const listToggle = page.getByTestId(
      `knowledge-base-active-toggle-${knowledgeBase.id}`,
    );
    await expect(listToggle).toBeChecked();
    await listToggle.click();
    await expect(listToggle).not.toBeChecked();
    await expect
      .poll(async () => {
        const current = await generatedApi.knowledgeBasesControllerFindOne(
          knowledgeBase.id,
          { api },
        );
        return current.isActive;
      })
      .toBe(false);

    await page.getByTestId(`knowledge-base-card-${knowledgeBase.id}`).click();
    const detailToggle = page.getByTestId(
      'knowledge-base-detail-active-toggle',
    );
    await expect(detailToggle).not.toBeChecked();
    await detailToggle.click();
    await expect(detailToggle).toBeChecked();
    await expect
      .poll(async () => {
        const current = await generatedApi.knowledgeBasesControllerFindOne(
          knowledgeBase.id,
          { api },
        );
        return current.isActive;
      })
      .toBe(true);

    const threadId = await startThread(
      page,
      'Which active knowledge bases can you use?',
    );
    await generatedApi.threadsControllerDelete(threadId, { api });
  } finally {
    await generatedApi.knowledgeBasesControllerDelete(knowledgeBase.id, {
      api,
    });
  }
});
