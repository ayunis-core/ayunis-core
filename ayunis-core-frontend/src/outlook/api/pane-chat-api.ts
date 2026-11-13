import type {
  DefaultModelSelectionResponseDto,
  GetThreadResponseDto,
  GetThreadsResponseDto,
  GetThreadsResponseDtoItem,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { PaneSession } from '@/outlook/api/pane-session';
import {
  readRunStream,
  type RunStreamEvent,
} from '@/outlook/lib/read-run-stream';

export interface PaneToolResult {
  toolId: string;
  toolName: string;
  result: string;
}

export type PaneRunInput =
  | { threadId: string; text: string }
  | { threadId: string; toolResult: PaneToolResult };

/** What the pane reads from a thread source response. */
export interface PaneSource {
  id: string;
  name: string;
  status: 'processing' | 'ready' | 'failed';
  processingError?: string;
}

export interface PaneChatApi {
  listThreads(): Promise<GetThreadsResponseDtoItem[]>;
  createThread(): Promise<GetThreadResponseDto>;
  getThread(threadId: string): Promise<GetThreadResponseDto>;
  addFileSource(threadId: string, file: File): Promise<PaneSource[]>;
  listSources(threadId: string): Promise<PaneSource[]>;
  /** Streams one run; resolves when the backend closes the response. */
  run(
    input: PaneRunInput,
    signal: AbortSignal,
    onEvent: (event: RunStreamEvent) => void,
  ): Promise<void>;
}

export class PaneRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Request failed with status ${status}`);
    this.name = 'PaneRequestError';
  }
}

async function ensureOk(response: Response): Promise<Response> {
  if (!response.ok) {
    throw new PaneRequestError(response.status, await response.text());
  }
  return response;
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
  const getJson = async <T>(path: string): Promise<T> =>
    (await (await ensureOk(await session.request(path))).json()) as T;

  return {
    async listThreads() {
      const page = await getJson<GetThreadsResponseDto>(
        '/threads?client=outlook&limit=30',
      );
      return page.data;
    },
    async createThread() {
      const selection = await getJson<DefaultModelSelectionResponseDto>(
        '/models/default-selection',
      );
      const response = await session.request('/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          selection.mode
            ? { mode: selection.mode }
            : { modelId: selection.permittedModelId },
        ),
      });
      return (await (await ensureOk(response)).json()) as GetThreadResponseDto;
    },
    getThread(threadId) {
      return getJson<GetThreadResponseDto>(`/threads/${threadId}`);
    },
    async addFileSource(threadId, file) {
      const form = new FormData();
      form.append('file', file);
      const response = await session.request(
        `/threads/${threadId}/sources/file`,
        { method: 'POST', body: form },
      );
      return (await (await ensureOk(response)).json()) as PaneSource[];
    },
    listSources(threadId) {
      return getJson<PaneSource[]>(`/threads/${threadId}/sources`);
    },
    async run(input, signal, onEvent) {
      const response = await session.request('/runs/send-message', {
        method: 'POST',
        headers: { Accept: 'text/event-stream' },
        body: runForm(input),
        signal,
      });
      await ensureOk(response);
      if (!response.body) throw new Error('The run response has no body');
      await readRunStream(response.body, onEvent);
    },
  };
}
