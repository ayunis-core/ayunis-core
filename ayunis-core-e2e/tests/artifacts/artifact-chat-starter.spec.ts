import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat } from '../../src/clients/api/memory.client';
import { getThread } from '../../src/clients/api/threads.client';
import { makeArtifactAnonymous } from '../../src/clients/artifacts.database.client';
import { createProjectThread } from '../../src/factories/workspace-context.factory';
import { expect, test } from '../../src/fixtures/test';

test('starts a chat from an artifact’s page in the artifact’s workspace, linked to the artifact, and offers an anonymous artifact only an anonymous chat', async ({
  page,
  api,
}) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}`;
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Starter ${suffix}`, icon: 'building-2' },
    { api },
  );
  const statute = await generatedApi.artifactsControllerCreate(
    {
      threadId: (await createProjectThread(api, workspace.id)).id,
      title: `Satzung ${suffix}`,
      content: '<p>Satzung</p>',
    },
    { api },
  );
  const notice = await generatedApi.artifactsControllerCreate(
    {
      threadId: await createChat(api),
      title: `Bescheid ${suffix}`,
      content: '<p>Bescheid</p>',
    },
    { api },
  );
  await makeArtifactAnonymous({
    artifactId: notice.id,
    title: `Bescheid ${suffix} an {{pii:PERSON_NAME_1}}`,
    content: '<p>Sehr geehrter Herr {{pii:PERSON_NAME_1}},</p>',
    dictionary: [{ category: 'person_name', maskIndex: 1, value: 'Jonas Weber' }],
  });

  await page.goto(`/artifacts/${statute.id}`);
  const starter = page.getByTestId('artifact-chat-starter');
  await expect(starter.getByTestId('chat-anonymous-toggle')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await starter.getByTestId('input').fill('Bitte die Satzung zusammenfassen');
  await starter.getByTestId('send').click();

  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  const threadId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1] ?? '';
  const thread = await getThread(api, threadId);
  expect(thread).toMatchObject({
    workspaceId: workspace.id,
    isAnonymous: false,
  });
  const linked = await generatedApi.artifactsControllerFindByThread(threadId, {
    api,
  });
  expect(linked.map(({ id }) => id)).toEqual([statute.id]);

  await page.goto(`/artifacts/${notice.id}`);
  const anonymousToggle = page
    .getByTestId('artifact-chat-starter')
    .getByTestId('chat-anonymous-toggle');
  await expect(anonymousToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(anonymousToggle).toBeDisabled();
});
