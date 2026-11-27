import { test, expect } from '../../src/fixtures/test';
import { sendMessage, startThread } from '../../src/flows/chat.flow';
import { speechMock } from '../../src/clients/mistral-speech-mock.client';
import { stubOfficeHost } from '../../src/clients/office-host-stub';
import { openSignedInPane } from '../../src/flows/outlook.flow';
import { createMemberSession } from '../../src/factories/user.factory';

// The speech contract server keeps one request log for the whole run.
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ request }) => {
  await speechMock.reset(request);
});

test.afterEach(async ({ request }) => {
  await speechMock.reset(request);
});

test('reads an answer aloud while its audio streams in and replays it from the cache', async ({
  page,
  org,
  request,
}) => {
  const reply = `${org.defaultModel.provider}::${org.defaultModel.name}`;
  await startThread(page, 'E2E read this aloud');
  await expect(page.getByTestId('assistant-message').last()).toContainText(
    reply,
  );
  await expect(page.getByTestId('chat-input-microphone')).toBeVisible();
  const readAloud = page.getByTestId('assistant-read-aloud').last();
  await expect(readAloud).toHaveAttribute('data-status', 'idle');

  // Playback starts on the first audio while the rest is still held back.
  await speechMock.hold(request);
  await readAloud.click();
  await expect(readAloud).toHaveAttribute('data-status', 'playing');
  // Which voice reads the mock reply depends on its model name; voice
  // selection is covered by the backend specs.
  expect(await speechMock.requests(request)).toEqual([
    expect.objectContaining({ input: reply, model: 'voxtral-mini-tts-3-0' }),
  ]);

  // Stopping mid-stream leaves nothing cached.
  await readAloud.click();
  await expect(readAloud).toHaveAttribute('data-status', 'idle');
  await speechMock.release(request);

  await readAloud.click();
  await expect(readAloud).toHaveAttribute('data-status', 'playing');
  await expect(readAloud).toHaveAttribute('data-status', 'idle', {
    timeout: 10_000,
  });
  expect(await speechMock.requests(request)).toHaveLength(2);

  // The complete audio is replayed without generating it again.
  await readAloud.click();
  await expect(readAloud).toHaveAttribute('data-status', 'playing');
  await expect(readAloud).toHaveAttribute('data-status', 'idle', {
    timeout: 10_000,
  });
  expect(await speechMock.requests(request)).toHaveLength(2);
});

// The Outlook pane renders the same conversation and reads with its own token.
test('reads an answer aloud in the Outlook pane', async ({
  api,
  browser,
  mail,
  org,
  request,
}) => {
  const reply = `${org.defaultModel.provider}::${org.defaultModel.name}`;
  // Without cookies, so the pane authenticates with its bearer token alone.
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  try {
    const pane = await context.newPage();
    await stubOfficeHost(pane);
    // A member of their own, so this chat stays out of other pane tests' history.
    const member = await createMemberSession(
      api,
      mail,
      `pane-read-aloud-${Date.now()}`,
    );
    try {
      await openSignedInPane(pane, member.api);
    } finally {
      await member.api.dispose();
    }
    await sendMessage(pane, 'E2E read this aloud');
    await expect(pane.getByTestId('assistant-message').last()).toContainText(
      reply,
    );
    const readAloud = pane.getByTestId('assistant-read-aloud').last();

    await readAloud.click();

    await expect(readAloud).toHaveAttribute('data-status', 'playing');
    expect(await speechMock.requests(request)).toEqual([
      expect.objectContaining({ input: reply }),
    ]);
  } finally {
    await context.close();
  }
});
