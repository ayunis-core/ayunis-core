import { readFile } from 'node:fs/promises';
import type { Download, Page } from '@playwright/test';
import {
  createArtifactByTool,
  currentArtifactContent,
  saveArtifactAsUser,
  spreadsheetContent,
} from '../../src/clients/api/artifact-tools.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat } from '../../src/clients/api/memory.client';
import { deleteThread } from '../../src/clients/api/threads.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { createProjectThread } from '../../src/factories/workspace-context.factory';
import { expect, test } from '../../src/fixtures/test';

async function openFromWorkspaceTab(
  page: Page,
  workspaceId: string,
  artifactId: string,
) {
  await page.goto(`/workspaces/${workspaceId}?tab=artifacts`);
  await page.getByTestId(`workspace-artifact-${artifactId}`).click();
  await expect(page).toHaveURL(new RegExp(`/artifacts/${artifactId}$`));
}

async function download(page: Page, trigger: () => Promise<void>) {
  const pending = page.waitForEvent('download');
  await trigger();
  return pending;
}

async function downloadedText(file: Download) {
  return readFile(await file.path(), 'utf8');
}

test('opens documents, diagrams and spreadsheets from the workspace tab on their own page to edit, revert and export them', async ({
  page,
  api,
}) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}`;
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Artefakte ${suffix}`, icon: 'building-2' },
    { api },
  );
  const thread = await createProjectThread(api, workspace.id);

  const document = await generatedApi.artifactsControllerCreate(
    {
      threadId: thread.id,
      title: `Bescheid ${suffix}`,
      content: '<p>Erster Entwurf</p>',
    },
    { api },
  );
  await saveArtifactAsUser(
    api,
    document.id,
    '<p>Erster Entwurf</p><p>Zweiter Absatz</p>',
  );
  const latestDocument = await currentArtifactContent(api, document.id);
  const diagram = await createArtifactByTool(api, thread.id, 'create_diagram', {
    title: `Antragsprozess ${suffix}`,
    content: 'flowchart TD\n  A[Antrag] --> B[Prüfung]',
  });
  await saveArtifactAsUser(
    api,
    diagram.id,
    'flowchart TD\n  A[Antrag] --> B[Prüfung]\n  B --> C[Bescheid]',
  );
  const spreadsheet = await createArtifactByTool(
    api,
    thread.id,
    'create_spreadsheet',
    {
      title: `Haushalt ${suffix}`,
      columns: ['Posten', 'Betrag'],
      rows: [['Miete', 1300]],
    },
  );
  const firstSpreadsheet = await currentArtifactContent(api, spreadsheet.id);
  await saveArtifactAsUser(
    api,
    spreadsheet.id,
    spreadsheetContent(['Posten', 'Betrag'], [['Miete', 1300], ['Strom', 95]]),
  );

  await test.step('document', async () => {
    await openFromWorkspaceTab(page, workspace.id, document.id);
    const content = page.getByTestId('artifact-document-content');
    await expect(content).toContainText('Zweiter Absatz');

    await content.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type(' Ergänzung');
    await page.goBack();
    await page.getByTestId('confirmation-cancel').click();
    await expect(page).toHaveURL(new RegExp(`/artifacts/${document.id}$`));
    await expect(content).toContainText('Ergänzung');

    await page.goBack();
    await page.getByTestId('confirmation-confirm').click();
    const row = page.getByTestId(`workspace-artifact-${document.id}`);
    await expect(row).toContainText('Version 3');
    const edited = await currentArtifactContent(api, document.id);
    expect(edited.content).toContain('Ergänzung');

    await row.click();
    await expect(content).toContainText('Ergänzung');
    await page.getByTestId('artifact-version-history-toggle').click();
    await page.getByTestId('artifact-version-revert-2').click();
    await expect
      .poll(() => currentArtifactContent(api, document.id))
      .toEqual({ version: 4, content: latestDocument.content });
    await expect(content).not.toContainText('Ergänzung');

    const docx = await download(page, () =>
      page.getByRole('button', { name: 'Word', exact: true }).click(),
    );
    expect(docx.suggestedFilename()).toBe(`Bescheid ${suffix}.docx`);
  });

  await test.step('diagram', async () => {
    await openFromWorkspaceTab(page, workspace.id, diagram.id);
    await expect(page.getByTestId('artifact-page')).toContainText('Bescheid');

    const svg = await download(page, () =>
      page.getByRole('button', { name: 'SVG', exact: true }).click(),
    );
    expect(svg.suggestedFilename()).toMatch(/\.svg$/);
    expect(await downloadedText(svg)).toContain('Bescheid');
  });

  await test.step('spreadsheet', async () => {
    await openFromWorkspaceTab(page, workspace.id, spreadsheet.id);
    const exportSpreadsheet = async () => {
      await page.getByRole('button', { name: 'Herunterladen' }).click();
      return download(page, () =>
        page.getByRole('menuitem', { name: 'CSV (.csv)' }).click(),
      );
    };
    expect(await downloadedText(await exportSpreadsheet())).toContain('Strom');

    await page.getByRole('button', { name: 'Zeilen hinzufügen' }).click();
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect
      .poll(async () => {
        const current = await currentArtifactContent(api, spreadsheet.id);
        return {
          version: current.version,
          rows: (JSON.parse(current.content ?? '{}') as { rows: unknown[] })
            .rows.length,
        };
      })
      .toEqual({ version: 3, rows: 3 });

    await page.getByTestId('artifact-version-history-toggle').click();
    await page.getByTestId('artifact-version-revert-1').click();
    await expect
      .poll(() => currentArtifactContent(api, spreadsheet.id))
      .toEqual({ version: 4, content: firstSpreadsheet.content });
    expect(await downloadedText(await exportSpreadsheet())).not.toContain(
      'Strom',
    );
  });
});

test('shows the not-found state for an artifact of another user and for a missing artifact', async ({
  page,
  api,
  browser,
  mail,
}) => {
  const owned = await generatedApi.artifactsControllerCreate(
    {
      threadId: await createChat(api),
      title: 'Vertraulicher Vermerk',
      content: '<p>Nur für die Verfasserin</p>',
    },
    { api },
  );

  await page.goto(`/artifacts/${owned.id}`);
  await expect(page.getByTestId('artifact-document-content')).toContainText(
    'Nur für die Verfasserin',
  );

  const { api: memberApi } = await createMemberSession(
    api,
    mail,
    `artifact-page-${Date.now()}`,
  );
  const memberContext = await browser.newContext({
    storageState: await memberApi.storageState(),
  });
  try {
    const memberPage = await memberContext.newPage();
    await memberPage.goto(`/artifacts/${owned.id}`);
    await expect(
      memberPage.getByTestId('artifact-side-panel-not-found'),
    ).toBeVisible();
    await expect(
      memberPage.getByTestId('artifact-document-content'),
    ).toHaveCount(0);
  } finally {
    await memberContext.close();
    await memberApi.dispose();
  }

  await page.goto('/artifacts/00000000-0000-4000-8000-000000000000');
  await expect(page.getByTestId('artifact-side-panel-not-found')).toBeVisible();
});

test('lets a workspace member open and edit a colleague’s artifact from the workspace tab, also after its chat is deleted, while non-members see not found', async ({
  page,
  api,
  browser,
  mail,
}) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}`;
  const creator = await createMemberSession(api, mail, `art-ws-a-${suffix}`);
  const colleague = await createMemberSession(api, mail, `art-ws-b-${suffix}`);
  const colleagueContext = await browser.newContext({
    storageState: await colleague.api.storageState(),
  });
  try {
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Gemeinsam ${suffix}`, icon: 'building-2' },
      { api: creator.api },
    );
    const chat = await createProjectThread(creator.api, workspace.id);
    const artifact = await generatedApi.artifactsControllerCreate(
      {
        threadId: chat.id,
        title: `Stellungnahme ${suffix}`,
        content: '<p>Entwurf zur Stellungnahme</p>',
      },
      { api: creator.api },
    );
    const colleaguePage = await colleagueContext.newPage();

    await colleaguePage.goto(`/artifacts/${artifact.id}`);
    await expect(
      colleaguePage.getByTestId('artifact-side-panel-not-found'),
    ).toBeVisible();

    await generatedApi.workspaceMembersControllerAdd(
      workspace.id,
      { userIds: [colleague.member.id], role: 'user' },
      { api: creator.api },
    );

    await openFromWorkspaceTab(colleaguePage, workspace.id, artifact.id);
    const content = colleaguePage.getByTestId('artifact-document-content');
    await expect(content).toContainText('Entwurf zur Stellungnahme');
    await content.click();
    await colleaguePage.keyboard.press('Control+End');
    await colleaguePage.keyboard.type(' Ergänzung aus dem Arbeitsbereich');
    await colleaguePage.goBack();
    await colleaguePage.getByTestId('confirmation-confirm').click();
    await expect
      .poll(
        async () =>
          (await currentArtifactContent(creator.api, artifact.id)).content,
      )
      .toContain('Ergänzung aus dem Arbeitsbereich');

    await deleteThread(creator.api, chat.id);

    await openFromWorkspaceTab(colleaguePage, workspace.id, artifact.id);
    await expect(content).toContainText('Ergänzung aus dem Arbeitsbereich');

    await page.goto(`/artifacts/${artifact.id}`);
    await expect(
      page.getByTestId('artifact-side-panel-not-found'),
    ).toBeVisible();
    await expect(page.getByTestId('artifact-document-content')).toHaveCount(0);
  } finally {
    await colleagueContext.close();
    await creator.api.dispose();
    await colleague.api.dispose();
  }
});
