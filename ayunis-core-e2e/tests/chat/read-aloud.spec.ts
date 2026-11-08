import { test, expect } from '../../src/fixtures/test';
import { startThread } from '../../src/flows/chat.flow';
import { speechMock } from '../../src/clients/mistral-speech-mock.client';

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
