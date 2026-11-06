import { renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  abortActiveThreadRun,
  startThreadRun,
  takeStartedThreadRun,
} from '@/features/thread-run';
import {
  completeThreadSubmission,
  getFailedThreadSubmission,
  getPendingThreadSubmission,
  resetThreadSubmission,
} from '@/pages/chat/model/pending-submissions';
import { usePendingMessage } from './usePendingMessage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const threadId = '00000000-0000-0000-0000-000000000001';

function renderPendingMessage(options?: {
  hasLoadedMessages?: boolean;
  strict?: boolean;
}) {
  const sendTextMessage = vi.fn().mockResolvedValue(undefined);
  renderHook(
    () =>
      usePendingMessage({
        threadId,
        hasLoadedMessages: options?.hasLoadedMessages ?? false,
        sendTextMessage,
      }),
    options?.strict ? { wrapper: StrictMode } : undefined,
  );
  return { sendTextMessage };
}

describe(usePendingMessage.name, () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
  });

  afterEach(() => {
    takeStartedThreadRun(threadId);
    abortActiveThreadRun(threadId);
    resetThreadSubmission(threadId);
    vi.unstubAllGlobals();
  });

  it('reads the response of the already started first message', async () => {
    const file = new File(['png'], 'screenshot.png', { type: 'image/png' });
    startThreadRun({ threadId, text: '', images: [{ file }] });

    const { sendTextMessage } = renderPendingMessage();

    await waitFor(() => expect(sendTextMessage).toHaveBeenCalledTimes(1));
    const [input] = sendTextMessage.mock.calls[0] as [
      { text: string; startedRequest?: unknown },
    ];
    expect(input.text).toBe('');
    expect(input.startedRequest).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shows the started message as pending until the thread has it', () => {
    startThreadRun({ threadId, text: 'Hallo', images: [] });

    renderPendingMessage({ hasLoadedMessages: false });

    expect(getPendingThreadSubmission(threadId)).toBe('Hallo');
  });

  it('does not show a pending copy of a message the thread already loaded', () => {
    startThreadRun({ threadId, text: 'Hallo', images: [] });

    renderPendingMessage({ hasLoadedMessages: true });

    expect(getPendingThreadSubmission(threadId)).toBeNull();
    completeThreadSubmission(threadId, true);
    expect(getFailedThreadSubmission(threadId)).toMatchObject({
      text: 'Hallo',
    });
  });

  it('takes the started message only once under StrictMode', async () => {
    startThreadRun({ threadId, text: 'Hallo', images: [] });

    const { sendTextMessage } = renderPendingMessage({ strict: true });

    await waitFor(() => expect(sendTextMessage).toHaveBeenCalled());
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when no message was started for the thread', () => {
    const { sendTextMessage } = renderPendingMessage();

    expect(sendTextMessage).not.toHaveBeenCalled();
    expect(getPendingThreadSubmission(threadId)).toBeNull();
  });
});
