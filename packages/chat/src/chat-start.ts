import {
  threadKnowledgeBasesControllerAddKnowledgeBase,
  threadMcpIntegrationsControllerAddMcpIntegration,
  threadSourcesControllerCompleteUpload,
  threadSourcesControllerCreateUpload,
  threadsControllerCreate,
} from '@ayunis/api-client/endpoints';
import type {
  GetThreadResponseDto,
  ModelMode,
} from '@ayunis/api-client/schemas';
import type { ChatResourceSummary, ChatStartOrigin } from './chat-config';

type ThreadSource = GetThreadResponseDto['sources'][number];
import { sourceUploadErrorKey } from './composer-errors';
import type { ThreadRunStart } from './started-thread-run';
import type {
  NewChatSourceFile,
  NewChatSourceStatus,
} from './use-new-chat-sources';

/** Everything a new chat starts with. */
export interface ChatStartRequest {
  readonly text: string;
  readonly images: ThreadRunStart['images'];
  readonly modelId?: string;
  /** The backend binds the model the mode resolves to. */
  readonly mode?: ModelMode;
  readonly isAnonymous: boolean;
  readonly workspaceId?: string;
  readonly origin?: ChatStartOrigin;
  readonly skillId?: string;
  readonly voiceInput?: boolean;
  readonly sources: readonly NewChatSourceFile[];
  readonly onSourceStatus?: (
    sourceId: string,
    status: NewChatSourceStatus,
  ) => void;
  readonly knowledgeBases: readonly ChatResourceSummary[];
  readonly integrations: readonly ChatResourceSummary[];
}

/** A step of the preparation failed; its translation key says which. */
export class ChatStartError extends Error {
  constructor(
    readonly messageKey: {
      readonly ns: 'chat' | 'common';
      readonly key: string;
    },
    readonly cause: unknown,
  ) {
    super(messageKey.key);
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { response } = error as { response?: { data?: { code?: unknown } } };
  const code = response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}

async function createThread(
  request: ChatStartRequest,
  signal: AbortSignal,
): Promise<GetThreadResponseDto> {
  try {
    return await threadsControllerCreate(
      {
        modelId: request.modelId,
        mode: request.mode,
        isAnonymous: request.isAnonymous,
        workspaceId: request.workspaceId,
        origin: request.origin,
      },
      signal,
    );
  } catch (error) {
    const key =
      errorCode(error) === 'MODEL_MODE_UNAVAILABLE'
        ? 'chat.errorModeUnavailable'
        : 'chat.errorSendMessage';
    throw new ChatStartError({ ns: 'chat', key }, error);
  }
}

async function uploadSource(
  threadId: string,
  source: NewChatSourceFile,
  report: (status: NewChatSourceStatus) => void,
  signal: AbortSignal,
): Promise<ThreadSource[]> {
  const { uploadSourceFile } = await import('@ayunis/api-client/source-upload');
  let reported = 0;
  try {
    const added = await uploadSourceFile(
      source.file,
      {
        createSession: (file, signal) =>
          threadSourcesControllerCreateUpload(
            threadId,
            { fileName: file.name, mimeType: file.type, fileSize: file.size },
            signal,
          ),
        complete: (uploadId, signal) =>
          threadSourcesControllerCompleteUpload(threadId, uploadId, signal),
      },
      signal,
      (progress) => {
        // A retried part reports from zero again; never show it going back.
        reported = Math.max(reported, progress);
        report({ kind: 'uploading', progress: reported });
      },
    );
    report({ kind: 'processing' });
    return added;
  } catch (error) {
    report({
      kind: 'failed',
      message: error instanceof Error ? error.message : 'Upload failed',
    });
    throw error;
  }
}

/**
 * Uploads every file to the new chat. The chat is not started without all of
 * them: one failure stops the others.
 */
async function uploadSources(
  threadId: string,
  request: ChatStartRequest,
  signal: AbortSignal,
): Promise<ThreadSource[]> {
  const uploads = new AbortController();
  const stop = () => uploads.abort();
  signal.addEventListener('abort', stop, { once: true });
  // Bytes still in flight after Stop must not revive the file's chip.
  const report = (sourceId: string) => (status: NewChatSourceStatus) => {
    if (!signal.aborted) request.onSourceStatus?.(sourceId, status);
  };
  request.sources.forEach(({ id }) =>
    report(id)({ kind: 'uploading', progress: 0 }),
  );
  const pending = request.sources.map((source) =>
    uploadSource(threadId, source, report(source.id), uploads.signal),
  );
  try {
    return (await Promise.all(pending)).flat();
  } catch (error) {
    uploads.abort();
    // Wait for the siblings' abort rejections so none surfaces as unhandled.
    await Promise.allSettled(pending);
    throw new ChatStartError(
      { ns: 'common', key: sourceUploadErrorKey(error) },
      error,
    );
  } finally {
    signal.removeEventListener('abort', stop);
  }
}

async function attachResources(
  threadId: string,
  request: ChatStartRequest,
  signal: AbortSignal,
): Promise<void> {
  for (const { id } of request.knowledgeBases) {
    signal.throwIfAborted();
    await threadKnowledgeBasesControllerAddKnowledgeBase(
      threadId,
      id,
      signal,
    ).catch((error: unknown) => {
      throw new ChatStartError(
        { ns: 'chat', key: 'chat.errorAddKnowledgeBase' },
        error,
      );
    });
  }
  for (const { id } of request.integrations) {
    signal.throwIfAborted();
    await threadMcpIntegrationsControllerAddMcpIntegration(
      threadId,
      id,
      signal,
    ).catch((error: unknown) => {
      throw new ChatStartError(
        { ns: 'chat', key: 'chat.errorAddIntegration' },
        error,
      );
    });
  }
}

function withSources(
  thread: GetThreadResponseDto,
  added: readonly ThreadSource[],
): GetThreadResponseDto {
  const known = new Set(thread.sources.map(({ id }) => id));
  const sources = added.filter(({ id }) => !known.has(id));
  return { ...thread, sources: [...thread.sources, ...sources] };
}

/**
 * Creates the chat with its files and resources, ready for its first
 * message. The chat it returns lists the uploaded files, which are processing.
 */
export async function prepareChat(
  request: ChatStartRequest,
  signal: AbortSignal,
): Promise<GetThreadResponseDto> {
  let thread = await createThread(request, signal);
  signal.throwIfAborted();
  if (request.sources.length > 0) {
    thread = withSources(
      thread,
      await uploadSources(thread.id, request, signal),
    );
    signal.throwIfAborted();
  }
  await attachResources(thread.id, request, signal);
  signal.throwIfAborted();
  return thread;
}
