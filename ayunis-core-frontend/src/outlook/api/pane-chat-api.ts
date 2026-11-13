import {
  getRunsControllerSendMessageUrl,
  modelModeDefaultsControllerGetDefaultSelection,
  sourceUploadsControllerAbort,
  sourceUploadsControllerSign,
  threadSourcesControllerCompleteUpload,
  threadSourcesControllerCreateUpload,
  threadSourcesControllerGetThreadSources,
  threadsControllerCreate,
  threadsControllerFindAll,
  threadsControllerFindOne,
} from '@/outlook/api/generated/ayunisCoreAPI';
import type {
  CSVDataSourceResponseDto,
  FileSourceResponseDto,
  GetThreadResponseDto,
  GetThreadsResponseDtoItem,
  SignSourceUploadRequestDto,
  SignedUploadUrlResponseDto,
  SourceUploadSessionResponseDto,
  UrlSourceResponseDto,
} from '@/outlook/api/generated/ayunisCoreAPI.schemas';
import {
  PaneRequestError,
  type PaneRequestInit,
} from '@/outlook/api/pane-fetch';
import type { PaneSession } from '@/outlook/api/pane-session';
import {
  readRunStream,
  type RunStreamEvent,
} from '@/outlook/lib/read-run-stream';

export { PaneRequestError };

export interface PaneToolResult {
  toolId: string;
  toolName: string;
  result: string;
}

export type PaneRunInput =
  | { threadId: string; text: string }
  | { threadId: string; toolResult: PaneToolResult };

type ThreadSourceResponse =
  FileSourceResponseDto | UrlSourceResponseDto | CSVDataSourceResponseDto;

/**
 * What the pane reads from a thread source response. Picked from the generated
 * DTOs so a backend change to these fields fails the type-check here.
 */
export type PaneSource = Pick<
  ThreadSourceResponse,
  'id' | 'name' | 'status' | 'processingErrorCode'
>;

export interface PaneChatApi {
  listThreads(): Promise<GetThreadsResponseDtoItem[]>;
  createThread(): Promise<GetThreadResponseDto>;
  getThread(threadId: string): Promise<GetThreadResponseDto>;
  /** Direct upload: reserve, transfer to storage, then complete. */
  createUpload(
    threadId: string,
    file: File,
  ): Promise<SourceUploadSessionResponseDto>;
  completeUpload(threadId: string, uploadId: string): Promise<PaneSource[]>;
  signUpload(
    uploadId: string,
    body: SignSourceUploadRequestDto,
    signal?: AbortSignal,
  ): Promise<SignedUploadUrlResponseDto>;
  abortUpload(uploadId: string): Promise<void>;
  listSources(threadId: string): Promise<PaneSource[]>;
  /** Streams one run; resolves when the backend closes the response. */
  run(
    input: PaneRunInput,
    signal: AbortSignal,
    onEvent: (event: RunStreamEvent) => void,
  ): Promise<void>;
}

/**
 * The generated client answers with the response union of the route. Only the
 * success arm can arrive: `paneFetch` throws on every other status.
 */
type Succeeded<TResponse> = TResponse extends {
  status: 200 | 201 | 204;
  data: infer TData;
}
  ? TData
  : never;

async function succeeded<TResponse extends { status: number; data: unknown }>(
  response: Promise<TResponse>,
): Promise<Succeeded<TResponse>> {
  return (await response).data as Succeeded<TResponse>;
}

function runForm(input: PaneRunInput): FormData {
  const form = new FormData();
  form.append('threadId', input.threadId);
  form.append('streaming', 'true');
  if ('text' in input) form.append('text', input.text);
  else form.append('toolResult', JSON.stringify(input.toolResult));
  return form;
}

/** The chat endpoints the backend opens to an Outlook pane session. */
export function createPaneChatApi(session: PaneSession): PaneChatApi {
  const on = (extra?: RequestInit): PaneRequestInit => ({ ...extra, session });

  return {
    async listThreads() {
      const page = await succeeded(
        threadsControllerFindAll({ client: 'outlook', limit: 30 }, on()),
      );
      return page.data;
    },
    async createThread() {
      const selection = await succeeded(
        modelModeDefaultsControllerGetDefaultSelection(on()),
      );
      return succeeded(
        threadsControllerCreate(
          selection.mode
            ? { mode: selection.mode }
            : { modelId: selection.permittedModelId },
          on(),
        ),
      );
    },
    getThread(threadId) {
      return succeeded(threadsControllerFindOne(threadId, on()));
    },
    createUpload(threadId, file) {
      return succeeded(
        threadSourcesControllerCreateUpload(
          threadId,
          { fileName: file.name, mimeType: file.type, fileSize: file.size },
          on(),
        ),
      );
    },
    completeUpload(threadId, uploadId) {
      return succeeded(
        threadSourcesControllerCompleteUpload(threadId, uploadId, on()),
      );
    },
    signUpload(uploadId, body, signal) {
      return succeeded(
        sourceUploadsControllerSign(uploadId, body, on({ signal })),
      );
    },
    async abortUpload(uploadId) {
      await sourceUploadsControllerAbort(uploadId, on());
    },
    listSources(threadId) {
      return succeeded(threadSourcesControllerGetThreadSources(threadId, on()));
    },
    async run(input, signal, onEvent) {
      // Not the generated call: it parses the body as JSON, and this one is
      // the SSE stream the pane reads as it arrives.
      const response = await session.request(
        getRunsControllerSendMessageUrl(),
        {
          method: 'POST',
          headers: { Accept: 'text/event-stream' },
          body: runForm(input),
          signal,
        },
      );
      if (!response.ok) {
        throw new PaneRequestError(response.status, await response.text());
      }
      if (!response.body) throw new Error('The run response has no body');
      await readRunStream(response.body, onEvent);
    },
  };
}
