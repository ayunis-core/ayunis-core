import {
  ARTIFACT_WRITE_SUCCEEDED,
  callArtifactTool,
  createArtifactByTool,
  currentArtifactContent,
  saveArtifactAsUser,
  spreadsheetContent,
  type DiagramReading,
  type SpreadsheetReading,
} from '../../src/clients/api/artifact-tools.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat } from '../../src/clients/api/memory.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';

test('the model reads user-edited diagrams and spreadsheets and retries a stale update after reading', async ({
  api,
}) => {
  test.setTimeout(120_000);
  const threadId = await createChat(api);
  const diagram = await createArtifactByTool(api, threadId, 'create_diagram', {
    title: 'Antragsprozess',
    content: 'flowchart TD\n  A[Antrag] --> B[Prüfung]',
  });
  const spreadsheet = await createArtifactByTool(
    api,
    threadId,
    'create_spreadsheet',
    { title: 'Haushalt 2026', columns: ['Posten', 'Betrag'], rows: [['Miete', 1300]] },
  );

  const userDiagram = 'flowchart TD\n  A[Antrag] --> B[Prüfung]\n  B --> C[Bescheid]';
  await saveArtifactAsUser(api, diagram.id, userDiagram);
  await saveArtifactAsUser(
    api,
    spreadsheet.id,
    spreadsheetContent(['Posten', 'Betrag'], [['Miete', 1300], ['Strom', 95]]),
  );

  const staleDiagramUpdate = await callArtifactTool(api, threadId, 'update_diagram', {
    artifact_id: diagram.id,
    content: 'flowchart TD\n  A --> Z',
    expected_version: 1,
  });
  expect(staleDiagramUpdate).toContain('Version conflict');
  expect(staleDiagramUpdate).toContain('Use read_diagram ');

  const diagramReading = JSON.parse(
    await callArtifactTool(api, threadId, 'read_diagram', { artifact_id: diagram.id }),
  ) as DiagramReading;
  expect(diagramReading).toMatchObject({
    artifactId: diagram.id,
    title: 'Antragsprozess',
    version: 2,
    content: userDiagram,
  });

  const retriedDiagram = `${diagramReading.content}\n  C --> D[Archiv]`;
  expect(
    await callArtifactTool(api, threadId, 'update_diagram', {
      artifact_id: diagram.id,
      content: retriedDiagram,
      expected_version: diagramReading.version,
    }),
  ).toBe(ARTIFACT_WRITE_SUCCEEDED);
  expect(await currentArtifactContent(api, diagram.id)).toEqual({
    version: 3,
    content: retriedDiagram,
  });

  const staleSpreadsheetUpdate = await callArtifactTool(
    api,
    threadId,
    'update_spreadsheet',
    {
      artifact_id: spreadsheet.id,
      columns: ['Posten', 'Betrag'],
      rows: [['Miete', 1300], ['Wasser', 40]],
      expected_version: 1,
    },
  );
  expect(staleSpreadsheetUpdate).toContain('Version conflict');
  expect(staleSpreadsheetUpdate).toContain('Use read_spreadsheet ');

  const spreadsheetReading = JSON.parse(
    await callArtifactTool(api, threadId, 'read_spreadsheet', {
      artifact_id: spreadsheet.id,
    }),
  ) as SpreadsheetReading;
  expect(spreadsheetReading).toMatchObject({
    artifactId: spreadsheet.id,
    title: 'Haushalt 2026',
    version: 2,
    columns: ['Posten', 'Betrag'],
    rows: [['Miete', 1300], ['Strom', 95]],
    nextPage: null,
  });

  const retriedRows = [...spreadsheetReading.rows, ['Wasser', 40]];
  expect(
    await callArtifactTool(api, threadId, 'update_spreadsheet', {
      artifact_id: spreadsheet.id,
      columns: spreadsheetReading.columns,
      rows: retriedRows,
      expected_version: spreadsheetReading.version,
    }),
  ).toBe(ARTIFACT_WRITE_SUCCEEDED);
  expect(await currentArtifactContent(api, spreadsheet.id)).toEqual({
    version: 3,
    content: spreadsheetContent(['Posten', 'Betrag'], retriedRows),
  });
});

test('reading another user’s diagram or spreadsheet is rejected like reading their document', async ({
  api,
  mail,
}) => {
  test.setTimeout(180_000);
  const key = `artifact-read-${Date.now()}`;
  const owner = await createMemberSession(api, mail, `${key}-owner`);
  const colleague = await createMemberSession(api, mail, `${key}-colleague`);

  const colleagueChat = await createChat(colleague.api);
  const colleagueDiagram = await createArtifactByTool(
    colleague.api,
    colleagueChat,
    'create_diagram',
    { title: 'Vertraulich', content: 'flowchart TD\n  A --> B' },
  );
  const colleagueSpreadsheet = await createArtifactByTool(
    colleague.api,
    colleagueChat,
    'create_spreadsheet',
    { title: 'Vertraulich', columns: ['Name'], rows: [['Geheim']] },
  );
  const colleagueDocument = await generatedApi.artifactsControllerCreate(
    { title: 'Vertraulich', content: '<p>Geheim</p>', threadId: colleagueChat },
    { api: colleague.api },
  );

  const ownerChat = await createChat(owner.api);
  await createArtifactByTool(owner.api, ownerChat, 'create_diagram', {
    title: 'Eigenes Diagramm',
    content: 'flowchart TD\n  X --> Y',
  });
  await createArtifactByTool(owner.api, ownerChat, 'create_spreadsheet', {
    title: 'Eigene Tabelle',
    columns: ['Posten'],
    rows: [['Miete']],
  });
  await generatedApi.artifactsControllerCreate(
    { title: 'Eigenes Dokument', content: '<p>Eigen</p>', threadId: ownerChat },
    { api: owner.api },
  );

  const rejection = (tool: string, artifactId: string) =>
    `The tool didn't provide any result due to the following error in tool usage: Failed to execute tool ${tool}: Artifact with ID '${artifactId}' not found`;
  expect(
    await callArtifactTool(owner.api, ownerChat, 'read_document', {
      artifact_id: colleagueDocument.id,
    }),
  ).toBe(rejection('read_document', colleagueDocument.id));
  expect(
    await callArtifactTool(owner.api, ownerChat, 'read_diagram', {
      artifact_id: colleagueDiagram.id,
    }),
  ).toBe(rejection('read_diagram', colleagueDiagram.id));
  expect(
    await callArtifactTool(owner.api, ownerChat, 'read_spreadsheet', {
      artifact_id: colleagueSpreadsheet.id,
    }),
  ).toBe(rejection('read_spreadsheet', colleagueSpreadsheet.id));
});
