import type { APIRequestContext } from '@playwright/test';
import {
  ARTIFACT_WRITE_SUCCEEDED,
  callArtifactTool,
  createArtifactByTool,
  currentArtifactContent,
  resolvePlaceholders,
  saveArtifactAsUser,
  spreadsheetContent,
} from '../../src/clients/api/artifact-tools.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat } from '../../src/clients/api/memory.client';
import { getThread } from '../../src/clients/api/threads.client';
import { setPiiWhitelist } from '../../src/clients/api/anonymization-settings.client';
import { PiiCategory } from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { expect, test } from '../../src/fixtures/test';

const REAL_VALUES = ['Anna Schmidt', 'anna.schmidt@example.com', 'Bernd Bauer'];

/** The stored content of an anonymous artifact as the editor shows it. */
async function shownContent(api: APIRequestContext, artifactId: string) {
  const artifact = await generatedApi.artifactsControllerFindOne(artifactId, {
    api,
  });
  const { content = '' } = await currentArtifactContent(api, artifactId);
  return {
    stored: content,
    shown: resolvePlaceholders(content, artifact.piiMasks ?? []),
    piiMasks: artifact.piiMasks ?? [],
  };
}

/** The placeholder of the value detection found around a real value. */
function tokenOf(
  piiMasks: readonly { token: string; value: string }[],
  value: string,
): string {
  const mask = piiMasks.find((entry) => entry.value.includes(value));
  if (!mask) throw new Error(`No placeholder for ${value}`);
  return mask.token;
}

// The editor shows anonymous artifacts with their real values and saves
// them masked again against the artifact's own dictionary. Creating
// anonymous artifacts takes an anonymous run, which needs the anonymisation
// service the CI stack does not run — start the stack with `./dev up --e2e
// --with-anonymisation` and run with E2E_WITH_ANONYMISATION=true.
test.describe('Editing anonymous artifacts with their real values', () => {
  // eslint-disable-next-line playwright/no-skipped-test -- environment gate, not a disabled test: the CI stack runs without the anonymisation service
  test.skip(
    process.env.E2E_WITH_ANONYMISATION !== 'true',
    'requires the anonymisation service (E2E_WITH_ANONYMISATION=true against a --with-anonymisation stack)',
  );

  // The mock model takes the tool arguments from the user's message, which an
  // anonymous run anonymizes; an artifact ID detected as PII would no longer
  // name the artifact.
  test.beforeEach(async ({ api }) => {
    await setPiiWhitelist(
      api,
      Object.values(PiiCategory).map((category) => ({
        category,
        pattern: '[0-9a-f-]{36}',
      })),
    );
  });

  test.afterEach(async ({ api }) => {
    await setPiiWhitelist(api, []);
  });

  test('a document round-trips unchanged, keeps known placeholders around edits and masks new values before a run reads it', async ({
    api,
  }) => {
    test.setTimeout(180_000);
    const chatId = await createChat(api, undefined, true);
    expect(
      await callArtifactTool(api, chatId, 'create_document', {
        title: 'Rückmeldung',
        content:
          '<p>Sehr geehrte Frau Anna Schmidt, bitte melden Sie sich unter anna.schmidt@example.com.</p>',
      }),
    ).toBe(ARTIFACT_WRITE_SUCCEEDED);
    const [created] = await generatedApi.artifactsControllerFindByThread(
      chatId,
      { api },
    );
    const opened = await shownContent(api, created.id);
    expect(opened.shown).toContain('Anna Schmidt');

    await saveArtifactAsUser(api, created.id, opened.shown);
    expect(await currentArtifactContent(api, created.id)).toEqual({
      version: 2,
      content: opened.stored,
    });

    await saveArtifactAsUser(
      api,
      created.id,
      `${opened.shown.replace('Sehr geehrte', 'Liebe')}<p>Kopie an Bernd Bauer</p>`,
    );
    const edited = await shownContent(api, created.id);
    for (const value of REAL_VALUES) {
      expect(edited.stored).not.toContain(value);
    }
    const anna = tokenOf(opened.piiMasks, 'Anna Schmidt');
    expect(tokenOf(edited.piiMasks, 'Anna Schmidt')).toBe(anna);
    expect(edited.stored).toContain(`Liebe ${anna}`);
    expect(edited.stored).toContain(
      `Kopie an ${tokenOf(edited.piiMasks, 'Bernd Bauer')}`,
    );

    const reading = JSON.parse(
      await callArtifactTool(api, chatId, 'read_document', {
        artifact_id: created.id,
      }),
    ) as { content: string };
    for (const value of REAL_VALUES) {
      expect(reading.content).not.toContain(value);
    }
    const { piiMasks: chatDictionary } = await getThread(api, chatId);
    expect(resolvePlaceholders(reading.content, chatDictionary)).toBe(
      edited.shown,
    );
  });

  test('a spreadsheet and a diagram round-trip unchanged, and a spreadsheet keeps known placeholders in edited cells', async ({
    api,
  }) => {
    test.setTimeout(180_000);
    const chatId = await createChat(api, undefined, true);
    const spreadsheet = await createArtifactByTool(
      api,
      chatId,
      'create_spreadsheet',
      {
        title: 'Kontakte',
        columns: ['Name', 'E-Mail'],
        rows: [['Anna Schmidt', 'anna.schmidt@example.com']],
      },
    );
    const opened = await shownContent(api, spreadsheet.id);
    const anna = tokenOf(opened.piiMasks, 'Anna Schmidt');

    await saveArtifactAsUser(api, spreadsheet.id, opened.shown);
    expect(await currentArtifactContent(api, spreadsheet.id)).toEqual({
      version: 2,
      content: opened.stored,
    });

    await saveArtifactAsUser(
      api,
      spreadsheet.id,
      spreadsheetContent(
        ['Name', 'E-Mail'],
        [
          ['Frau Anna Schmidt', 'anna.schmidt@example.com'],
          ['Bernd Bauer', null],
        ],
      ),
    );
    const edited = await shownContent(api, spreadsheet.id);
    const stored = JSON.parse(edited.stored) as {
      columns: string[];
      rows: unknown[][];
    };
    expect(stored.columns).toEqual(
      (JSON.parse(opened.stored) as { columns: string[] }).columns,
    );
    expect(stored.rows).toEqual([
      [`Frau ${anna}`, tokenOf(opened.piiMasks, 'anna.schmidt@example.com')],
      [tokenOf(edited.piiMasks, 'Bernd Bauer'), null],
    ]);

    const diagram = await createArtifactByTool(api, chatId, 'create_diagram', {
      title: 'Ablauf',
      content: 'flowchart TD\n  A["Antrag von Anna Schmidt"] --> B[Prüfung]',
    });
    const openedDiagram = await shownContent(api, diagram.id);
    expect(openedDiagram.stored).not.toContain('Anna Schmidt');
    await saveArtifactAsUser(api, diagram.id, openedDiagram.shown);
    expect(await currentArtifactContent(api, diagram.id)).toEqual({
      version: 2,
      content: openedDiagram.stored,
    });
  });
});
