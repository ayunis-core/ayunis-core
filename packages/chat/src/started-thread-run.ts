import type { RunEndpoints } from './run-endpoints';
import type { StartedRunRequest } from './run-execution';

export interface StartedThreadRun {
  text: string;
  images: File[];
  voiceInput: boolean;
  messageCountBeforeSend: number;
  request: StartedRunRequest;
}

export interface ThreadRunStart {
  messageCountBeforeSend?: number;
  threadId: string;
  text: string;
  images: Array<{ file: File; altText?: string }>;
  skillId?: string;
  voiceInput?: boolean;
}

export function createStartedThreadRuns(
  registerActiveThreadRun: (
    threadId: string,
    controller: AbortController,
  ) => void,
) {
  const startedRuns = new Map<string, StartedThreadRun>();

  /**
   * Sends a new chat's first message before its chat page exists. The page
   * takes the run once it mounts and reads the response from the start, so no
   * stream event is lost while the new-chat animation is still playing.
   */
  function startRun(request: ThreadRunStart, send: RunEndpoints['send']): void {
    const started = sendFirstMessage(request, send);
    registerActiveThreadRun(request.threadId, started.request.controller);
    startedRuns.set(request.threadId, started);
  }

  function takeStartedThreadRun(threadId: string): StartedThreadRun | null {
    const run = startedRuns.get(threadId) ?? null;
    startedRuns.delete(threadId);
    return run;
  }

  function cancelStartedRun(
    threadId: string,
    stop: (threadId: string) => void,
  ): void {
    if (!startedRuns.delete(threadId)) return;
    stop(threadId);
  }

  return {
    startRun,
    takeStartedThreadRun,
    cancelStartedRun,
    clearStartedThreadRuns: () => startedRuns.clear(),
  };
}

function sendFirstMessage(
  {
    threadId,
    text,
    images,
    skillId,
    voiceInput = false,
    messageCountBeforeSend = 0,
  }: ThreadRunStart,
  send: RunEndpoints['send'],
): StartedThreadRun {
  const files = images.map((image) => image.file);
  const controller = new AbortController();
  const response = send(
    {
      threadId,
      text,
      images: files,
      imageAltTexts: images.map(
        (image) => image.altText ?? (image.file.name || 'Pasted image'),
      ),
      skillId,
      streaming: true,
    },
    controller.signal,
  );
  // The chat page handles a failed request once it takes the run.
  response.catch(() => undefined);
  return {
    text,
    images: files,
    voiceInput,
    messageCountBeforeSend,
    request: { controller, response },
  };
}
