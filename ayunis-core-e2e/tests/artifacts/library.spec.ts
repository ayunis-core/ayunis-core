import type { Page } from '@playwright/test';
import {
  createArtifactByTool,
  saveArtifactAsUser,
} from '../../src/clients/api/artifact-tools.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat } from '../../src/clients/api/memory.client';
import { makeArtifactAnonymous } from '../../src/clients/artifacts.database.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { createProjectThread } from '../../src/factories/workspace-context.factory';
import { expect, test } from '../../src/fixtures/test';

/** The rows of the Ablage, without the badges inside them. */
function libraryRows(page: Page) {
  return page.getByTestId(/^library-artifact-[0-9a-f-]{36}$/);
}

async function searchLibrary(page: Page, term: string) {
  await page.getByTestId('library-search').fill(term);
  await expect(page).toHaveURL(/search=/);
}

test('lists the user’s personal artifacts in the Ablage, newest change first, finds them by title and type, and deletes one from its page', async ({
  page,
  api,
}) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}`;
  const chatId = await createChat(api);
  const document = await generatedApi.artifactsControllerCreate(
    { threadId: chatId, title: `Bauantrag ${suffix}`, content: '<p>Antrag</p>' },
    { api },
  );
  const diagram = await createArtifactByTool(api, chatId, 'create_diagram', {
    title: `Ablauf ${suffix}`,
    content: 'flowchart TD\n  A[Antrag] --> B[Prüfung]',
  });
  const letter = await generatedApi.artifactsControllerCreate(
    { threadId: chatId, title: `Brief ${suffix}`, content: '<p>Entwurf</p>' },
    { api },
  );
  const person = `Erika Lindner-${suffix}`;
  await makeArtifactAnonymous({
    artifactId: letter.id,
    title: `Brief ${suffix} an {{pii:PERSON_NAME_1}}`,
    content: '<p>Sehr geehrte Frau {{pii:PERSON_NAME_1}},</p>',
    dictionary: [{ category: 'person_name', maskIndex: 1, value: person }],
  });
  await saveArtifactAsUser(api, document.id, '<p>Antrag, ergänzt</p>');
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Ablage ${suffix}`, icon: 'building-2' },
    { api },
  );
  const workspaceChat = await createProjectThread(api, workspace.id);
  const workspaceArtifact = await generatedApi.artifactsControllerCreate(
    {
      threadId: workspaceChat.id,
      title: `Beschluss ${suffix}`,
      content: '<p>Beschluss</p>',
    },
    { api },
  );

  await page.goto('/');
  await page.getByTestId('sidebar-navigation-library').click();
  await expect(page).toHaveURL(/\/library/);

  await searchLibrary(page, suffix);
  const rows = libraryRows(page);
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toHaveAttribute(
    'data-testid',
    `library-artifact-${document.id}`,
  );
  await expect(rows.nth(1)).toHaveAttribute(
    'data-testid',
    `library-artifact-${letter.id}`,
  );
  await expect(rows.nth(2)).toHaveAttribute(
    'data-testid',
    `library-artifact-${diagram.id}`,
  );
  await expect(
    page.getByTestId(`library-artifact-${workspaceArtifact.id}`),
  ).toHaveCount(0);
  const letterRow = page.getByTestId(`library-artifact-${letter.id}`);
  await expect(letterRow).toContainText(person);
  await expect(letterRow).not.toContainText('{{pii:');
  await expect(
    letterRow.getByTestId('library-artifact-anonymized'),
  ).toBeVisible();

  await searchLibrary(page, person);
  await expect(rows).toHaveCount(1);
  await expect(letterRow).toBeVisible();

  await searchLibrary(page, suffix);
  await expect(rows).toHaveCount(3);
  await page.getByTestId('library-type-filter').click();
  await page.getByTestId('library-type-filter-diagram').click();
  await expect(rows).toHaveCount(1);
  await expect(
    page.getByTestId(`library-artifact-${diagram.id}`),
  ).toBeVisible();

  await page.getByTestId('library-type-filter').click();
  await page.getByTestId('library-type-filter-all').click();
  await page.getByTestId(`library-artifact-${document.id}`).click();
  await expect(page).toHaveURL(new RegExp(`/artifacts/${document.id}$`));
  await expect(page.getByTestId('artifact-document-content')).toContainText(
    'ergänzt',
  );
  await page.getByTestId('artifact-delete').click();
  await page.getByTestId('confirmation-confirm').click();

  await expect(page).toHaveURL(/\/library$/);
  await searchLibrary(page, suffix);
  await expect(rows).toHaveCount(2);
  await expect(
    page.getByTestId(`library-artifact-${document.id}`),
  ).toHaveCount(0);
  await expect(
    generatedApi.artifactsControllerFindOne(document.id, { api }),
  ).rejects.toThrow(/\(HTTP 404\)/);
});

test('offers delete on a workspace artifact only to its creator and to members who may manage the workspace', async ({
  page,
  api,
  browser,
  mail,
}) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}`;
  const colleague = await createMemberSession(api, mail, `art-lib-b-${suffix}`);
  const colleagueContext = await browser.newContext({
    storageState: await colleague.api.storageState(),
  });
  try {
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Rechte ${suffix}`, icon: 'building-2' },
      { api },
    );
    await generatedApi.workspaceMembersControllerAdd(
      workspace.id,
      { userIds: [colleague.member.id], role: 'user' },
      { api },
    );
    const adminArtifact = await generatedApi.artifactsControllerCreate(
      {
        threadId: (await createProjectThread(api, workspace.id)).id,
        title: `Satzung ${suffix}`,
        content: '<p>Satzung</p>',
      },
      { api },
    );
    const colleagueArtifact = await generatedApi.artifactsControllerCreate(
      {
        threadId: (await createProjectThread(colleague.api, workspace.id)).id,
        title: `Notiz ${suffix}`,
        content: '<p>Notiz</p>',
      },
      { api: colleague.api },
    );
    const colleaguePage = await colleagueContext.newPage();

    await colleaguePage.goto(`/artifacts/${adminArtifact.id}`);
    await expect(
      colleaguePage.getByTestId('artifact-document-content'),
    ).toContainText('Satzung');
    await expect(colleaguePage.getByTestId('artifact-delete')).toHaveCount(0);

    await colleaguePage.goto(`/artifacts/${colleagueArtifact.id}`);
    await expect(
      colleaguePage.getByTestId('artifact-document-content'),
    ).toContainText('Notiz');
    await expect(colleaguePage.getByTestId('artifact-delete')).toBeVisible();

    await page.goto(`/artifacts/${colleagueArtifact.id}`);
    await page.getByTestId('artifact-delete').click();
    await page.getByTestId('confirmation-confirm').click();
    await expect(page).toHaveURL(
      new RegExp(`/workspaces/${workspace.id}\\?tab=artifacts$`),
    );
    await expect(
      page.getByTestId(`workspace-artifact-${adminArtifact.id}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`workspace-artifact-${colleagueArtifact.id}`),
    ).toHaveCount(0);
  } finally {
    await colleagueContext.close();
    await colleague.api.dispose();
  }
});
