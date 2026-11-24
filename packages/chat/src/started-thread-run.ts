import { registerActiveThreadRun } from './active-thread-run';
import type { RunEndpoints } from './run-endpoints';
import type { StartedRunRequest } from './run-execution';

export interface StartedThreadRun {
  text: string;
  images: File[];
  voiceInput: boolean;
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

const startedRuns = new Map<string, StartedThreadRun>();

/**
 * Sends a new chat's first message before its chat page exists. The page
 * takes the run once it mounts and reads the response from the start, so no
 * stream event is lost while the new-chat animation is still playing.
 */
export function startRun(
  { threadId, text, images, skillId, voiceInput = false }: ThreadRunStart,
  send: RunEndpoints['send'],
): void {
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
  registerActiveThreadRun(threadId, controller);
  startedRuns.set(threadId, {
    text,
    images: files,
    voiceInput,
    request: { controller, response },
  });
}

export function takeStartedThreadRun(
  threadId: string,
): StartedThreadRun | null {
  const run = startedRuns.get(threadId) ?? null;
  startedRuns.delete(threadId);
  return run;
}

export function cancelStartedRun(
  threadId: string,
  stop: (threadId: string) => void,
): void {
  if (!startedRuns.delete(threadId)) return;
  stop(threadId);
}
