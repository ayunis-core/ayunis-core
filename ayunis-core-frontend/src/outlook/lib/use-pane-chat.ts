import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaneChatApi, PaneRunInput } from '@/outlook/api/pane-chat-api';
import { SessionExpiredError } from '@/outlook/api/pane-session';
import { addAttachmentAsSource } from '@/outlook/lib/attachment-source';
import {
  currentOutlookItemKey,
  executeOutlookTool,
  isAwaitingResultTool,
  type OutlookToolOutcome,
} from '@/outlook/lib/outlook-tools';
import {
  answeredToolCallIds,
  hasCallAwaitingConfirmation,
  localUserMessage,
  outlookToolCalls,
  upsertMessage,
  type OutlookToolCall,
  type PaneMessage,
} from '@/outlook/lib/pane-messages';
import type { RunStreamEvent } from '@/outlook/lib/read-run-stream';

export type PaneToolState = { status: 'running' } | OutlookToolOutcome;

export type PaneChatError = 'runFailed' | 'loadFailed';

interface PaneChatOptions {
  api: PaneChatApi;
  onSessionExpired: () => void;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

// Only calls made while this pane watched the run are executed: reopening a
// chat must not insert an old draft into the open email again.
export function usePaneChat({ api, onSessionExpired }: PaneChatOptions) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PaneMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<PaneChatError | null>(null);
  const [toolStates, setToolStates] = useState<Record<string, PaneToolState>>(
    {},
  );
  const messagesRef = useRef<PaneMessage[]>([]);
  const handledCalls = useRef(new Set<string>());
  const controller = useRef<AbortController | null>(null);
  // Aborting the request the pane is streaming does not reach the tools that
  // run after it, so stopping is a flag the loop checks between its steps.
  const stopped = useRef(false);
  // Bumped whenever the pane moves on; a load that resolves afterwards is no
  // longer what the user is looking at and is dropped.
  const generation = useRef(0);
  const runItemKey = useRef<string | null>(null);
  // What the pane has open right now. A delete that resolves after the user
  // moved on must not judge by the thread id its callback closed over.
  const openThreadId = useRef<string | null>(null);

  // The pane is torn down while a run is in flight when the user signs out or
  // Outlook closes it; the loop would otherwise keep writing to the email.
  useEffect(
    () => () => {
      stopped.current = true;
      controller.current?.abort();
    },
    [],
  );

  const replaceMessages = useCallback((next: PaneMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const fail = useCallback(
    (cause: unknown, kind: PaneChatError) => {
      if (isAbort(cause)) return;
      if (cause instanceof SessionExpiredError) onSessionExpired();
      else setError(kind);
    },
    [onSessionExpired],
  );

  const setToolState = (id: string, state: PaneToolState) =>
    setToolStates((current) => ({ ...current, [id]: state }));

  async function executeCall(call: OutlookToolCall, runThreadId: string) {
    handledCalls.current.add(call.id);
    setToolState(call.id, { status: 'running' });
    const outcome = await executeOutlookTool(call.name, call.params, {
      extractAttachmentText: (file) =>
        // The run that just ended still owns the controller, so Stop and the
        // unmount cleanup reach the upload poll, which can take two minutes.
        addAttachmentAsSource(
          api,
          runThreadId,
          file,
          controller.current?.signal,
        ),
      expectedItemKey: runItemKey.current ?? undefined,
    });
    setToolState(call.id, outcome);
    return outcome;
  }

  /**
   * Executes the Outlook calls of the run that just ended. A read call's
   * result goes back to the backend, which continues the run with it.
   */
  async function nextInputAfterRun(
    runThreadId: string,
  ): Promise<PaneRunInput | null> {
    // A turn the pane cannot complete is not its to act on: the backend
    // refuses a tool result while a sibling call waits for the user. Its calls
    // are abandoned for good, or a later run would act on a stale draft.
    if (hasCallAwaitingConfirmation(messagesRef.current)) {
      outlookToolCalls(messagesRef.current).forEach(({ id }) =>
        handledCalls.current.add(id),
      );
      return null;
    }
    const answered = answeredToolCallIds(messagesRef.current);
    const calls = outlookToolCalls(messagesRef.current).filter(
      ({ id }) => !handledCalls.current.has(id),
    );
    let next: PaneRunInput | null = null;
    for (const call of calls) {
      if (stopped.current) return null;
      const awaiting = isAwaitingResultTool(call.name);
      if (awaiting && (answered.has(call.id) || next)) {
        handledCalls.current.add(call.id);
        continue;
      }
      const outcome = await executeCall(call, runThreadId);
      if (awaiting && outcome.status === 'result') {
        next = {
          threadId: runThreadId,
          toolResult: {
            toolId: call.id,
            toolName: call.name,
            result: outcome.result,
          },
        };
      }
    }
    return next;
  }

  async function runUntilSettled(first: PaneRunInput) {
    let input: PaneRunInput | null = first;
    while (input && !stopped.current) {
      const abort = new AbortController();
      controller.current = abort;
      const run = { failed: false };
      await api.run(input, abort.signal, (event: RunStreamEvent) => {
        if (event.type === 'message') {
          replaceMessages(upsertMessage(messagesRef.current, event.message));
        } else if (event.type === 'error') {
          run.failed = true;
          setError('runFailed');
        }
      });
      input = run.failed ? null : await nextInputAfterRun(first.threadId);
    }
  }

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || running) return;
    generation.current++;
    runItemKey.current = currentOutlookItemKey();
    setError(null);
    stopped.current = false;
    setRunning(true);
    replaceMessages([
      ...messagesRef.current,
      localUserMessage(threadId ?? '', prompt),
    ]);
    try {
      const id = threadId ?? (await api.createThread()).id;
      setThreadId(id);
      await runUntilSettled({ threadId: id, text: prompt });
    } catch (cause) {
      fail(cause, 'runFailed');
    } finally {
      controller.current = null;
      setRunning(false);
    }
  }

  function stop() {
    stopped.current = true;
    controller.current?.abort();
  }

  function reset(id: string | null, loaded: PaneMessage[]) {
    generation.current++;
    stopped.current = true;
    controller.current?.abort();
    handledCalls.current = new Set(
      outlookToolCalls(loaded).map(({ id }) => id),
    );
    openThreadId.current = id;
    setThreadId(id);
    setToolStates({});
    setError(null);
    replaceMessages(loaded);
  }

  async function openThread(id: string) {
    reset(id, []);
    const opening = generation.current;
    try {
      const { messages: loaded } = await api.getThread(id);
      if (generation.current === opening) reset(id, loaded);
    } catch (cause) {
      if (generation.current === opening) fail(cause, 'loadFailed');
    }
  }

  return {
    threadId,
    messages,
    running,
    error,
    toolStates,
    send,
    stop,
    openThread,
    newChat: () => reset(null, []),
    closeIfOpen: (id: string) => {
      if (openThreadId.current === id) reset(null, []);
    },
  };
}
