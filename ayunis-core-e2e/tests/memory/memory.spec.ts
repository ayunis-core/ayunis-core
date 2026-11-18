import {
  REMEMBER_PROMPT,
  chat,
  clearMemory,
  createChat,
  defaultModel,
  readPersonalMemory,
  reportMemory,
} from '../../src/clients/api/memory.client';
import { setMemoryAccess } from '../../src/clients/api/models.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';

// Memory needs a model an admin allowed it for; the worker org's default
// model starts without access.
test.beforeEach(async ({ api }) => {
  await setMemoryAccess(api, (await defaultModel(api)).id, true);
});

test.afterEach(async ({ api }) => {
  await setMemoryAccess(api, (await defaultModel(api)).id, false);
});

test('keeps what the assistant remembers about one user out of another user’s memory and chats', async ({
  api,
  mail,
}) => {
  test.setTimeout(60_000);
  const secret = `Sachbearbeiterin im Bauamt ${Date.now()}`;
  const { api: memberApi } = await createMemberSession(
    api,
    mail,
    `memory-${Date.now()}`,
  );
  try {
    await clearMemory(api);
    expect(await readPersonalMemory(api)).toBe('');
    expect(await readPersonalMemory(memberApi)).toBe('');

    expect(
      await chat(api, await createChat(api), `${REMEMBER_PROMPT}${secret}`),
    ).toBe('memory-stored');

    expect(await readPersonalMemory(api)).toBe(secret);
    expect(await reportMemory(api, await createChat(api))).toMatchObject({
      personal: secret,
    });
    expect(await readPersonalMemory(memberApi)).toBe('');
    expect(
      await reportMemory(memberApi, await createChat(memberApi)),
    ).toMatchObject({ tools: 'get_memory,set_memory', personal: 'none' });
  } finally {
    await clearMemory(api);
    await memberApi.dispose();
  }
});

test('offers memory in chats and reminds the assistant on every fifth user message', async ({
  api,
}) => {
  test.setTimeout(60_000);
  const threadId = await createChat(api);

  const reports = [];
  for (let message = 1; message <= 5; message++) {
    reports.push(await reportMemory(api, threadId));
  }

  expect(reports.map((report) => report.nudge)).toEqual([
    'no',
    'no',
    'no',
    'no',
    'yes',
  ]);
  expect(reports[0]).toMatchObject({
    tools: 'get_memory,set_memory',
    section: 'yes',
  });
});
