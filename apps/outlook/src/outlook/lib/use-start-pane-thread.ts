import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getThreadsControllerCreateMutationKey,
  getThreadsControllerFindOneQueryKey,
  threadsControllerCreate,
} from '@ayunis/api-client/endpoints';
import type { ModelMode } from '@ayunis/api-client/schemas';
import type { ChatRunLifecycle, SendMessageInput } from '@ayunis/chat/runs';
import { uploadPaneFiles, waitForPaneFiles } from '@/outlook/api/chat-api';

export interface NewPaneChatInput extends SendMessageInput {
  readonly modelId?: string;
  readonly mode?: ModelMode;
  readonly isAnonymous: boolean;
  readonly files: File[];
}

interface PaneThreadStartOptions {
  readonly lifecycle: ChatRunLifecycle;
  readonly draftKey: string | undefined;
  readonly openThread: (draftKey: string, threadId: string) => void;
  readonly onError: (error: unknown) => void;
}

function useStartAttempt(draftKey: string | undefined) {
  const attempts = useRef(new Map<string, AbortController>()).current;
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());

  function begin(key: string) {
    if (attempts.has(key)) return;
    const attempt = new AbortController();
    attempts.set(key, attempt);
    setPending(new Set(attempts.keys()));
    return attempt;
  }
  const finish = useCallback(
    (key: string, attempt: AbortController) => {
      if (attempts.get(key) !== attempt) return;
      attempts.delete(key);
      setPending(new Set(attempts.keys()));
    },
    [attempts],
  );

  function stop(key = draftKey) {
    if (key === undefined) return;
    const attempt = attempts.get(key);
    if (!attempt) return;
    attempt.abort();
    finish(key, attempt);
  }

  useLayoutEffect(
    () => () => {
      attempts.forEach((attempt) => attempt.abort());
      attempts.clear();
    },
    [attempts],
  );
  return {
    begin,
    finish,
    stop,
    busy: draftKey !== undefined && pending.has(draftKey),
  };
}

async function preparePaneThread({
  modelId,
  mode,
  isAnonymous,
  files,
  signal,
}: Pick<NewPaneChatInput, 'modelId' | 'mode' | 'isAnonymous' | 'files'> & {
  signal: AbortSignal;
}) {
  let thread = await threadsControllerCreate(
    { modelId, mode, isAnonymous },
    signal,
  );
  signal.throwIfAborted();
  if (files.length > 0) {
    await uploadPaneFiles(thread.id, files, signal);
    thread = await waitForPaneFiles(thread.id, signal);
    signal.throwIfAborted();
  }
  return thread;
}

export function useStartPaneThread({
  lifecycle,
  draftKey,
  openThread,
  onError,
}: PaneThreadStartOptions) {
  const queryClient = useQueryClient();
  const operation = useStartAttempt(draftKey);
  const create = useMutation({
    mutationKey: getThreadsControllerCreateMutationKey(),
    // The email tracker watches this mutation. A thread is ready to associate
    // only after its first send can open it.
    mutationFn: preparePaneThread,
  });

  async function start(input: NewPaneChatInput, accepted: () => void) {
    if (draftKey === undefined) return;
    const attempt = operation.begin(draftKey);
    if (!attempt) return;
    const { signal } = attempt;
    const session = lifecycle.getSessionSignal();
    const abort = () => attempt.abort();
    session.addEventListener('abort', abort, { once: true });
    try {
      const thread = await create.mutateAsync({
        modelId: input.modelId,
        mode: input.mode,
        isAnonymous: input.isAnonymous,
        files: input.files,
        signal,
      });
      signal.throwIfAborted();
      queryClient.setQueryData(
        getThreadsControllerFindOneQueryKey(thread.id),
        thread,
      );
      lifecycle.startThreadRun({
        threadId: thread.id,
        text: input.text,
        images: input.images ?? [],
        voiceInput: input.voiceInput,
      });
      accepted();
      openThread(draftKey, thread.id);
    } catch (error) {
      if (!signal.aborted) onError(error);
    } finally {
      session.removeEventListener('abort', abort);
      operation.finish(draftKey, attempt);
    }
  }
  return { start, busy: operation.busy, stop: operation.stop };
}
