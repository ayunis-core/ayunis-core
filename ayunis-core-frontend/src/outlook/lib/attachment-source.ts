import type { PaneChatApi, PaneSource } from '@/outlook/api/pane-chat-api';

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

export interface AttachmentFile {
  name: string;
  contentType: string;
  base64: string;
}

function toFile({ name, contentType, base64 }: AttachmentFile): File {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new File([bytes], name, { type: contentType });
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

async function waitUntilProcessed(
  api: PaneChatApi,
  threadId: string,
  ids: Set<string>,
): Promise<PaneSource[]> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    const sources = (await api.listSources(threadId)).filter(({ id }) =>
      ids.has(id),
    );
    const done = sources.every(({ status }) => status !== 'processing');
    if (done || Date.now() > deadline) return sources;
    await wait(POLL_INTERVAL_MS);
  }
}

/**
 * PDFs and Office documents go through the backend's source pipeline instead
 * of a second parser in the pane: the attachment becomes a source of the
 * chat, and the run the pane resumes offers the source tools to read it.
 */
export async function addAttachmentAsSource(
  api: PaneChatApi,
  threadId: string,
  attachment: AttachmentFile,
): Promise<string> {
  const added = await api.addFileSource(threadId, toFile(attachment));
  const sources = await waitUntilProcessed(
    api,
    threadId,
    new Set(added.map(({ id }) => id)),
  );
  const failed = sources.find(({ status }) => status === 'failed');
  if (failed || sources.length === 0) {
    return JSON.stringify({
      error: failed?.processingError ?? 'the attachment could not be read',
    });
  }
  if (sources.some(({ status }) => status === 'processing')) {
    return JSON.stringify({
      error:
        'the attachment is still being processed; it is attached to this chat as a source, read it with the source tools in a moment',
    });
  }
  return JSON.stringify({
    attachedAsSources: sources.map(({ id, name }) => ({ id, name })),
    note: 'The attachment was added to this chat as a source. Read it with source_get_text or search it with source_query.',
  });
}
