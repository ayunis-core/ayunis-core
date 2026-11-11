import { postRunMessage } from '@/features/thread-run/api/postRunMessage';
import { stopThreadRun } from '@/features/thread-run/api/stopThreadRun';
import { registerActiveThreadRun } from './active-thread-run';

export interface StartedRunRequest {
  controller: AbortController;
  response: Promise<Response>;
}

export interface StartedThreadRun {
  text: string;
  images: File[];
  voiceInput: boolean;
  request: StartedRunRequest;
}

const startedRuns = new Map<string, StartedThreadRun>();

/**
 * Sends a new chat's first message before its chat page exists. The page
 * takes the run once it mounts and reads the response from the start, so no
 * stream event is lost while the new-chat animation is still playing.
 */
export function startThreadRun({
  threadId,
  text,
  images,
  skillId,
  voiceInput = false,
}: {
  threadId: string;
  text: string;
  images: Array<{ file: File; altText?: string }>;
  skillId?: string;
  voiceInput?: boolean;
}): void {
  const files = images.map((image) => image.file);
  const controller = new AbortController();
  const response = postRunMessage(
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

export function cancelStartedThreadRun(threadId: string): void {
  if (!startedRuns.delete(threadId)) return;
  stopThreadRun(threadId);
}
