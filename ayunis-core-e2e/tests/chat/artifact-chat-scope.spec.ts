import {
  callArtifactTool,
  createArtifactByTool,
  currentArtifactContent,
  spreadsheetContent,
  type ArtifactToolName,
} from '../../src/clients/api/artifact-tools.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat } from '../../src/clients/api/memory.client';
import { expect, test } from '../../src/fixtures/test';

test('a run reads and changes only the artifacts of its own chat, not those of the user’s other chats', async ({
  api,
}) => {
  test.setTimeout(180_000);
  const otherChat = await createChat(api);
  const documentContent = '<p>Vermerk zur Sitzung</p>';
  const document = await generatedApi.artifactsControllerCreate(
    { title: 'Vermerk', content: documentContent, threadId: otherChat },
    { api },
  );
  const diagramContent = 'flowchart TD\n  A[Antrag] --> B[Prüfung]';
  const diagram = await createArtifactByTool(api, otherChat, 'create_diagram', {
    title: 'Antragsprozess',
    content: diagramContent,
  });
  const spreadsheet = await createArtifactByTool(
    api,
    otherChat,
    'create_spreadsheet',
    { title: 'Haushalt 2026', columns: ['Posten'], rows: [['Miete']] },
  );

  // The chat's own diagram and spreadsheet make the run offer their tools.
  const ownChat = await createChat(api);
  await createArtifactByTool(api, ownChat, 'create_diagram', {
    title: 'Eigenes Diagramm',
    content: 'flowchart TD\n  X --> Y',
  });
  await createArtifactByTool(api, ownChat, 'create_spreadsheet', {
    title: 'Eigene Tabelle',
    columns: ['Posten'],
    rows: [['Strom']],
  });
  const ownList = await generatedApi.artifactsControllerFindByThread(ownChat, {
    api,
  });
  expect(ownList.map((artifact) => artifact.title)).toEqual([
    'Eigenes Diagramm',
    'Eigene Tabelle',
  ]);

  expect(
    await callArtifactTool(api, otherChat, 'read_document', {
      artifact_id: document.id,
    }),
  ).toContain('Vermerk zur Sitzung');

  const calls: [ArtifactToolName, string, Record<string, unknown>][] = [
    ['read_document', document.id, {}],
    [
      'update_document',
      document.id,
      { content: '<p>Überschrieben</p>', expected_version: 1 },
    ],
    [
      'edit_document',
      document.id,
      {
        edits: [{ old_text: 'Sitzung', new_text: 'Klausur' }],
        expected_version: 1,
      },
    ],
    ['read_diagram', diagram.id, {}],
    [
      'update_diagram',
      diagram.id,
      { content: 'flowchart TD\n  A --> Z', expected_version: 1 },
    ],
    ['read_spreadsheet', spreadsheet.id, {}],
    [
      'update_spreadsheet',
      spreadsheet.id,
      { columns: ['Posten'], rows: [['Überschrieben']], expected_version: 1 },
    ],
  ];
  for (const [tool, artifactId, args] of calls) {
    expect(
      await callArtifactTool(api, ownChat, tool, {
        artifact_id: artifactId,
        ...args,
      }),
    ).toBe(
      `The tool didn't provide any result due to the following error in tool usage: Failed to execute tool ${tool}: Artifact with ID '${artifactId}' not found`,
    );
  }

  expect(await currentArtifactContent(api, document.id)).toEqual({
    version: 1,
    content: documentContent,
  });
  expect(await currentArtifactContent(api, diagram.id)).toEqual({
    version: 1,
    content: diagramContent,
  });
  expect(await currentArtifactContent(api, spreadsheet.id)).toEqual({
    version: 1,
    content: spreadsheetContent(['Posten'], [['Miete']]),
  });
});
