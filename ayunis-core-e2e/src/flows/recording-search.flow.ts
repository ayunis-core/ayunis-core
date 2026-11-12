import type { APIRequestContext, Locator, Page } from '@playwright/test';
import {
  getRecording,
  uploadRecordingAudio,
} from '../clients/api/recordings.client';
import { createSilentWav } from '../factories/audio.factory';
import {
  createPersonalThread,
  createProjectThread,
} from '../factories/workspace-context.factory';
import { expect } from '../fixtures/test';
import { sendMessage } from './chat.flow';

/**
 * The mock model calls recording_search with these arguments and answers
 * `recording-search::<count>` followed by one cited line per match:
 * `<recording name> (transcript|summary) {{source:…}}`.
 */
export interface RecordingSearchArguments {
  queries?: string[];
  uploadedFrom?: string;
  uploadedTo?: string;
}

const SEARCH_TIMEOUT = { timeout: 30_000 };

/** Uploads audio and waits until its transcript, and if asked its summary, is searchable. */
export async function uploadSearchableAudio(
  api: APIRequestContext,
  recordingId: string,
  { withSummary = false } = {},
): Promise<void> {
  await uploadRecordingAudio(api, recordingId, {
    name: `sitzung-${recordingId.slice(0, 8)}.wav`,
    mimeType: 'audio/wav',
    buffer: createSilentWav(5),
  });
  await expect
    .poll(
      async () => {
        const recording = await getRecording(api, recordingId);
        return withSummary
          ? recording.summary?.status === 'ready'
          : ['summarizing', 'ready'].includes(recording.status);
      },
      { timeout: 90_000 },
    )
    .toBe(true);
}

/**
 * Asks in a new chat, in the workspace if one is given, so every answer is
 * the last message of its own thread.
 */
export async function searchRecordingsInNewChat(
  page: Page,
  api: APIRequestContext,
  options: { workspaceId?: string; search?: RecordingSearchArguments } = {},
): Promise<{ threadId: string; answer: Locator }> {
  const thread = options.workspaceId
    ? await createProjectThread(api, options.workspaceId)
    : await createPersonalThread(api);
  await page.goto(`/chats/${thread.id}`);
  const search = options.search ? `: ${JSON.stringify(options.search)}` : '';
  await sendMessage(page, `E2E search recordings${search}`);
  const answer = page.getByTestId('assistant-message').last();
  await expect(answer).toContainText('recording-search::', SEARCH_TIMEOUT);
  return { threadId: thread.id, answer };
}

/** The chunk IDs the answer cites. */
export async function citedChunkIds(answer: Locator): Promise<string[]> {
  const citations = answer.getByTestId('source-citation');
  const ids = await Promise.all(
    (await citations.all()).map((citation) =>
      citation.getAttribute('data-source-chunk-id'),
    ),
  );
  return ids.filter((id): id is string => id !== null);
}
