import type { APIRequestContext } from '@playwright/test';
import {
  createArtifactByTool,
  saveArtifactAsUser,
} from '../src/clients/api/artifact-tools.client';
import { generatedApi } from '../src/clients/api/generated-api';
import { createProjectThread } from '../src/factories/workspace-context.factory';
import type { PrMediaContext, PrMediaScene } from './types';

const LETTER = [
  '<h1>Bescheid über die Grundsteuer 2026</h1>',
  '<p>Sehr geehrte Frau Muster,</p>',
  '<p>für das Grundstück Hauptstraße 12 wird die Grundsteuer für das Jahr 2026 auf <strong>412,00 €</strong> festgesetzt.</p>',
  '<ul><li>Fälligkeit: 15. Februar, 15. Mai, 15. August, 15. November</li><li>Hebesatz: 380 %</li></ul>',
  '<p>Mit freundlichen Grüßen</p><p>Ihre Gemeindeverwaltung</p>',
].join('');

async function seedWorkspace(api: APIRequestContext) {
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Grundsteuer ${Date.now()}`, icon: 'building-2' },
    { api },
  );
  const thread = await createProjectThread(api, workspace.id);
  return { workspace, thread };
}

async function seedDocument(api: APIRequestContext, threadId: string) {
  const document = await generatedApi.artifactsControllerCreate(
    { threadId, title: 'Grundsteuerbescheid 2026', content: '<p>Entwurf</p>' },
    { api },
  );
  await saveArtifactAsUser(api, document.id, LETTER);
  return document;
}

async function openArtifact(context: PrMediaContext, artifactId: string) {
  await context.page.goto(`/artifacts/${artifactId}`);
}

export default [
  {
    name: 'artifact-page-document',
    path: '/chat',
    viewports: ['desktop', 'mobile'],
    waitFor: async (context) => {
      const api = context.page.request;
      const { thread } = await seedWorkspace(api);
      await openArtifact(context, (await seedDocument(api, thread.id)).id);
      return context.page.getByTestId('artifact-document-content');
    },
  },
  {
    name: 'artifact-page-spreadsheet',
    path: '/chat',
    viewports: ['desktop'],
    waitFor: async (context) => {
      const api = context.page.request;
      const { thread } = await seedWorkspace(api);
      const spreadsheet = await createArtifactByTool(
        api,
        thread.id,
        'create_spreadsheet',
        {
          title: 'Haushalt 2026',
          columns: ['Posten', 'Ansatz 2025', 'Ansatz 2026'],
          rows: [
            ['Grundsteuer B', 412000, 431000],
            ['Gewerbesteuer', 1250000, 1310000],
            ['Kitagebühren', 98000, 101500],
          ],
        },
      );
      await openArtifact(context, spreadsheet.id);
      return context.page
        .getByTestId('artifact-page')
        .locator('revogr-data .rgCell')
        .first();
    },
  },
  {
    name: 'artifact-page-diagram',
    path: '/chat',
    viewports: ['desktop'],
    waitFor: async (context) => {
      const api = context.page.request;
      const { thread } = await seedWorkspace(api);
      const diagram = await createArtifactByTool(
        api,
        thread.id,
        'create_diagram',
        {
          title: 'Antragsprozess',
          content:
            'flowchart TD\n  A[Antrag eingegangen] --> B[Prüfung]\n  B --> C[Bescheid]',
        },
      );
      await openArtifact(context, diagram.id);
      return context.page.getByTestId('artifact-page').locator('svg').first();
    },
  },
  {
    name: 'artifact-page-not-found',
    path: '/artifacts/00000000-0000-4000-8000-000000000000',
    viewports: ['desktop'],
    waitFor: async ({ page }) =>
      page.getByTestId('artifact-side-panel-not-found'),
  },
  {
    name: 'artifact-page-from-workspace-tab',
    path: '/chat',
    viewports: ['desktop'],
    waitFor: async (context) => {
      const api = context.page.request;
      const { workspace, thread } = await seedWorkspace(api);
      await seedDocument(api, thread.id);
      await context.page.goto(`/workspaces/${workspace.id}?tab=artifacts`);
      return context.page.getByTestId('workspace-tab-artifacts');
    },
    demos: [
      {
        name: 'open-edit-revert',
        action: async ({ page, expect }) => {
          await page.locator('[data-testid^="workspace-artifact-"]').click();
          const content = page.getByTestId('artifact-document-content');
          await expect(content).toBeVisible();
          await content.click();
          await page.keyboard.press('Control+End');
          await page.keyboard.type(' Bitte überweisen Sie fristgerecht.');
          await page.getByRole('button', { name: 'Speichern' }).click();
          await page.getByTestId('artifact-version-history-toggle').click();
          await expect(
            page.getByTestId('artifact-version-revert-2'),
          ).toBeVisible();
          await page.getByTestId('artifact-version-revert-2').click();
          await expect(content).not.toContainText('fristgerecht');
        },
      },
    ],
  },
] satisfies PrMediaScene[];
