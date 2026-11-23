import type { Page } from '@playwright/test';
import {
  createArtifactByTool,
  currentArtifactContent,
  spreadsheetContent,
} from '../../src/clients/api/artifact-tools.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat } from '../../src/clients/api/memory.client';
import { makeArtifactAnonymous } from '../../src/clients/artifacts.database.client';
import { expect, test } from '../../src/fixtures/test';

const dictionary = [
  { category: 'person_name', maskIndex: 1, value: 'Anna Schmidt' },
  { category: 'email_address', maskIndex: 1, value: 'anna@example.org' },
];

async function expectRealValues(page: Page, artifactId: string) {
  await page.goto(`/artifacts/${artifactId}`);
  const artifactPage = page.getByTestId('artifact-page');
  await expect(page.getByTestId('artifact-anonymized-badge')).toBeVisible();
  await expect(artifactPage).toContainText('Anna Schmidt');
  await expect(artifactPage).toContainText('anna@example.org');
  await expect(artifactPage).not.toContainText('{{pii:');
}

test('shows anonymous documents, diagrams and spreadsheets with the real values of their own dictionary and saves them masked again', async ({
  page,
  api,
}) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}`;
  const chatId = await createChat(api);
  const documentContent =
    '<p>Sehr geehrte Frau {{pii:PERSON_NAME_1}},</p><p>bitte antworten Sie an {{pii:EMAIL_ADDRESS_1}}.</p>';

  const document = await generatedApi.artifactsControllerCreate(
    { threadId: chatId, title: `Brief ${suffix}`, content: '<p>Entwurf</p>' },
    { api },
  );
  await makeArtifactAnonymous({
    artifactId: document.id,
    title: `Brief ${suffix} an {{pii:PERSON_NAME_1}}`,
    content: documentContent,
    dictionary,
  });
  const diagram = await createArtifactByTool(api, chatId, 'create_diagram', {
    title: `Ablauf ${suffix}`,
    content: 'flowchart TD\n  A[Antrag] --> B[Prüfung]',
  });
  await makeArtifactAnonymous({
    artifactId: diagram.id,
    title: `Ablauf ${suffix}`,
    content:
      'flowchart TD\n  A["Antrag von {{pii:PERSON_NAME_1}}"] --> B["Rückfrage an {{pii:EMAIL_ADDRESS_1}}"]',
    dictionary,
  });
  const spreadsheet = await createArtifactByTool(
    api,
    chatId,
    'create_spreadsheet',
    { title: `Kontakte ${suffix}`, columns: ['Name'], rows: [['Platzhalter']] },
  );
  await makeArtifactAnonymous({
    artifactId: spreadsheet.id,
    title: `Kontakte ${suffix}`,
    content: spreadsheetContent(
      ['Name', 'E-Mail'],
      [['{{pii:PERSON_NAME_1}}', '{{pii:EMAIL_ADDRESS_1}}']],
    ),
    dictionary,
  });

  await test.step('document', async () => {
    await expectRealValues(page, document.id);
    await expect(page.getByTestId('artifact-page')).toContainText(
      `Brief ${suffix} an Anna Schmidt`,
    );

    // Saving the real values unchanged stores the placeholders again, with
    // nothing left to detect.
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect
      .poll(() => currentArtifactContent(api, document.id))
      .toEqual({ version: 2, content: documentContent });
  });

  await test.step('diagram', async () => {
    await expectRealValues(page, diagram.id);
  });

  await test.step('spreadsheet', async () => {
    await expectRealValues(page, spreadsheet.id);
  });

  await test.step('chat side panel', async () => {
    await page.goto(`/chats/${chatId}`);
    await page.getByTestId('chat-side-panel-toggle').click();
    await page.getByTestId('chat-side-panel-tab-artifacts').click();
    const listItem = page.getByTestId(`artifact-list-item-${document.id}`);
    await expect(listItem).toContainText(`Brief ${suffix} an Anna Schmidt`);

    await listItem.click();
    const content = page.getByTestId('artifact-document-content');
    await expect(content).toContainText('Sehr geehrte Frau Anna Schmidt');
    await expect(content).toContainText('anna@example.org');
    await expect(page.getByTestId('artifact-anonymized-badge')).toBeVisible();
  });
});
