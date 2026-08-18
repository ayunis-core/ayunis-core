import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';

function getDefaultModelId(
  response: Awaited<
    ReturnType<
      typeof generatedApi.modelsDefaultsControllerGetEffectiveDefaultModel
    >
  >,
): string {
  if (!response.permittedLanguageModel) {
    throw new Error('The e2e organization has no permitted language model');
  }
  return response.permittedLanguageModel.id;
}

test.describe('email artifacts in chat', () => {
  test('opens an email artifact created by the assistant', async ({
    page,
    api,
  }) => {
    const defaultModel =
      await generatedApi.modelsDefaultsControllerGetEffectiveDefaultModel({
        api,
      });
    const thread = await generatedApi.threadsControllerCreate(
      { modelId: getDefaultModelId(defaultModel) },
      { api },
    );
    const artifactId = 'email-artifact-e2e';
    const subject = 'Order request';
    const now = '2026-08-18T12:00:00.000Z';
    const emailArtifact = {
      id: artifactId,
      type: 'email',
      threadId: thread.id,
      userId: thread.userId,
      title: subject,
      currentVersionNumber: 1,
      versions: [
        {
          id: 'email-version-e2e',
          artifactId,
          versionNumber: 1,
          content: JSON.stringify({
            format: 'email-v1',
            subject,
            to: ['recipient@example.com'],
            cc: [],
            bcc: [],
            body: 'Please send the order.',
          }),
          authorType: 'ASSISTANT',
          authorId: null,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await page.route(`**/api/threads/${thread.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...thread,
          messages: [
            {
              id: 'assistant-email-message',
              threadId: thread.id,
              createdAt: now,
              role: 'assistant',
              content: [
                {
                  type: 'tool_use',
                  id: 'create-email-tool-call',
                  name: 'create_email',
                  params: {
                    subject,
                    to: ['recipient@example.com'],
                    cc: [],
                    bcc: [],
                    body: 'Please send the order.',
                  },
                },
              ],
            },
          ],
        }),
      });
    });
    await page.route(
      `**/api/artifacts/thread/${thread.id}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([emailArtifact]),
        });
      },
    );
    await page.route(`**/api/artifacts/${artifactId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emailArtifact),
      });
    });

    await page.goto(`/chats/${thread.id}`);

    const openButton = page.getByTestId('chat-artifact-open-button');
    await expect(openButton).toBeVisible();
    await expect(openButton).toBeEnabled();
    await openButton.click();

    await expect(page).toHaveURL(
      new RegExp(`/chats/${thread.id}\\?artifactId=${artifactId}`),
    );
    await expect(page.getByRole('heading', { name: subject })).toBeVisible();
  });
});
