import {
  ARTIFACT_WRITE_SUCCEEDED,
  callArtifactTool,
  createArtifactByTool,
  currentArtifactContent,
  resolvePlaceholders,
  saveArtifactAsUser,
} from '../../src/clients/api/artifact-tools.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat, defaultModel } from '../../src/clients/api/memory.client';
import { setPermittedModelAnonymousOnly } from '../../src/clients/api/models.client';
import { getThread } from '../../src/clients/api/threads.client';
import { setPiiWhitelist } from '../../src/clients/api/anonymization-settings.client';
import { PiiCategory } from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { expect, test } from '../../src/fixtures/test';

// Anonymous artifacts keep their own placeholder dictionary; runs translate
// placeholders between it and the chat by exact lookup. Anonymous runs
// anonymize the user's message, which needs the anonymisation service the CI
// stack does not run — start the stack with `./dev up --e2e
// --with-anonymisation` and run with E2E_WITH_ANONYMISATION=true.
test.describe('Anonymous artifacts', () => {
  // eslint-disable-next-line playwright/no-skipped-test -- environment gate, not a disabled test: the CI stack runs without the anonymisation service
  test.skip(
    process.env.E2E_WITH_ANONYMISATION !== 'true',
    'requires the anonymisation service (E2E_WITH_ANONYMISATION=true against a --with-anonymisation stack)',
  );

  const realValues = ['Anna Schmidt', 'anna.schmidt@example.com', 'Bernd Bauer'];

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

  test('an anonymous run reads and writes an artifact only in the chat’s placeholders, never its real values', async ({
    api,
  }) => {
    test.setTimeout(180_000);
    const chatId = await createChat(api, (await defaultModel(api)).id, true);
    expect(
      await callArtifactTool(api, chatId, 'create_document', {
        title: 'Rückmeldung an Anna Schmidt',
        content:
          '<p>Sehr geehrte Frau Anna Schmidt, bitte melden Sie sich unter anna.schmidt@example.com.</p>',
      }),
    ).toBe(ARTIFACT_WRITE_SUCCEEDED);
    const [created] = await generatedApi.artifactsControllerFindByThread(
      chatId,
      { api },
    );
    expect(created.isAnonymous).toBe(true);
    await saveArtifactAsUser(
      api,
      created.id,
      `${(await currentArtifactContent(api, created.id)).content}<p>Kopie an Bernd Bauer</p>`,
    );
    const artifact = await generatedApi.artifactsControllerFindOne(created.id, {
      api,
    });
    const stored = (await currentArtifactContent(api, created.id)).content ?? '';
    const realText = resolvePlaceholders(stored, artifact.piiMasks ?? []);
    for (const value of realValues) {
      expect(stored).not.toContain(value);
      expect(realText).toContain(value);
    }
    expect(artifact.title).not.toContain('Anna Schmidt');
    expect(resolvePlaceholders(artifact.title, artifact.piiMasks ?? [])).toBe(
      'Rückmeldung an Anna Schmidt',
    );

    const reading = JSON.parse(
      await callArtifactTool(api, chatId, 'read_document', {
        artifact_id: created.id,
      }),
    ) as { title: string; content: string; version: number };

    for (const value of realValues) {
      expect(reading.content).not.toContain(value);
      expect(reading.title).not.toContain(value);
    }
    const { piiMasks: chatDictionary } = await getThread(api, chatId);
    expect(resolvePlaceholders(reading.content, chatDictionary)).toBe(realText);
    expect(resolvePlaceholders(reading.title, chatDictionary)).toBe(
      'Rückmeldung an Anna Schmidt',
    );

    expect(
      await callArtifactTool(api, chatId, 'update_document', {
        artifact_id: created.id,
        content: `${reading.content}<p>Gelesen</p>`,
        expected_version: reading.version,
      }),
    ).toBe(ARTIFACT_WRITE_SUCCEEDED);
    const updated = await generatedApi.artifactsControllerFindOne(created.id, {
      api,
    });
    const writtenBack =
      (await currentArtifactContent(api, created.id)).content ?? '';
    expect(resolvePlaceholders(writtenBack, updated.piiMasks ?? [])).toBe(
      `${realText}<p>Gelesen</p>`,
    );

    expect(
      await callArtifactTool(api, chatId, 'update_document', {
        artifact_id: created.id,
        content: '<p>{{pii:PERSON_NAME_99}}</p>',
        expected_version: reading.version + 1,
      }),
    ).toContain('{{pii:PERSON_NAME_99}}');
    expect(await currentArtifactContent(api, created.id)).toEqual({
      version: reading.version + 1,
      content: writtenBack,
    });
  });

  test('an artifact converted to normal leaves the anonymous chat that wrote it, whose messages and masks stay, and a normal chat reads its real values', async ({
    api,
  }) => {
    test.setTimeout(180_000);
    const anonymousChat = await createChat(
      api,
      (await defaultModel(api)).id,
      true,
    );
    expect(
      await callArtifactTool(api, anonymousChat, 'create_document', {
        title: 'Antwort an Anna Schmidt',
        content: '<p>Sehr geehrte Frau Anna Schmidt</p>',
      }),
    ).toBe(ARTIFACT_WRITE_SUCCEEDED);
    const [created] = await generatedApi.artifactsControllerFindByThread(
      anonymousChat,
      { api },
    );
    const before = await getThread(api, anonymousChat);

    await generatedApi.artifactsControllerConvertToNormal(created.id, { api });

    const after = await getThread(api, anonymousChat);
    expect(after.messages).toEqual(before.messages);
    expect(after.piiMasks).toEqual(before.piiMasks);
    expect(
      await generatedApi.artifactsControllerFindByThread(anonymousChat, {
        api,
      }),
    ).toEqual([]);
    expect(after.piiMasks.length).toBeGreaterThan(0);
    expect(
      await callArtifactTool(api, anonymousChat, 'read_document', {
        artifact_id: created.id,
      }),
    ).toContain(`Artifact with ID '${created.id}' not found`);

    const normalChat = await createChat(api);
    await generatedApi.threadArtifactsControllerAttach(normalChat, created.id, {
      api,
    });
    const normalReading = JSON.parse(
      await callArtifactTool(api, normalChat, 'read_document', {
        artifact_id: created.id,
      }),
    ) as { title: string; content: string };
    expect(normalReading).toMatchObject({
      title: 'Antwort an Anna Schmidt',
      content: '<p>Sehr geehrte Frau Anna Schmidt</p>',
    });
  });

  test('runs only see artifacts of their own mode, also in a normal chat whose model is anonymous-only', async ({
    api,
  }) => {
    test.setTimeout(180_000);
    const model = await defaultModel(api);
    const chatId = await createChat(api, model.id);
    const normal = await createArtifactByTool(api, chatId, 'create_diagram', {
      title: 'Normaler Ablauf',
      content: 'flowchart TD\n  A[Antrag] --> B[Prüfung]',
    });
    expect(normal.isAnonymous).toBe(false);

    try {
      await setPermittedModelAnonymousOnly(api, model.id, true);
      expect(
        await callArtifactTool(api, chatId, 'read_diagram', {
          artifact_id: normal.id,
        }),
      ).toBe('not-offered');
      const anonymous = await createArtifactByTool(
        api,
        chatId,
        'create_diagram',
        {
          title: 'Anonymer Ablauf',
          content: 'flowchart TD\n  X[Eingang] --> Y[Ablage]',
        },
      );
      expect(anonymous.isAnonymous).toBe(true);
      expect(
        await callArtifactTool(api, chatId, 'read_diagram', {
          artifact_id: normal.id,
        }),
      ).toContain(`Artifact with ID '${normal.id}' not found`);

      await setPermittedModelAnonymousOnly(api, model.id, false);
      expect(
        await callArtifactTool(api, chatId, 'read_diagram', {
          artifact_id: anonymous.id,
        }),
      ).toContain(`Artifact with ID '${anonymous.id}' not found`);
      expect(
        await callArtifactTool(api, chatId, 'read_diagram', {
          artifact_id: normal.id,
        }),
      ).toContain('Normaler Ablauf');
    } finally {
      await setPermittedModelAnonymousOnly(api, model.id, false);
    }
  });
});
