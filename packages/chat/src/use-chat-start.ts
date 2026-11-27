import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { getThreadsControllerCreateMutationKey } from '@ayunis/api-client/endpoints';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import type { ChatEvents } from './chat-config';
import {
  ChatStartError,
  prepareChat,
  type ChatStartRequest,
} from './chat-start';
import { showError } from './chat-toasts';
import type { ChatRunLifecycle } from './run-lifecycle';

/** The new chats being prepared in a session, by draft. */
function createChatStarts() {
  const attempts = new Map<string, AbortController>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    begin(key: string): AbortController | undefined {
      if (attempts.has(key)) return undefined;
      const attempt = new AbortController();
      attempts.set(key, attempt);
      notify();
      return attempt;
    },
    finish(key: string, attempt: AbortController) {
      if (attempts.get(key) !== attempt) return;
      attempts.delete(key);
      notify();
    },
    stop(key: string) {
      const attempt = attempts.get(key);
      if (!attempt) return;
      attempt.abort();
      attempts.delete(key);
      notify();
    },
    isPending: (key: string) => attempts.has(key),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

type ChatStarts = ReturnType<typeof createChatStarts>;

const sessionStarts = new WeakMap<ChatRunLifecycle, ChatStarts>();

function chatStartsOf(lifecycle: ChatRunLifecycle): ChatStarts {
  let starts = sessionStarts.get(lifecycle);
  if (!starts) {
    starts = createChatStarts();
    sessionStarts.set(lifecycle, starts);
  }
  return starts;
}

/**
 * Stops preparing the new chat of a draft, e.g. when the host leaves it for
 * another view. A chat whose first message was handed off is not affected.
 */
export function stopChatStart(lifecycle: ChatRunLifecycle, draftKey: string) {
  chatStartsOf(lifecycle).stop(draftKey);
}

interface StartedChat {
  readonly stop: () => void;
}

function settleAfter(startedAt: number, settleMs: number) {
  const stopped = new AbortController();
  const settled = new Promise<boolean>((resolve) => {
    const timer = setTimeout(
      () => resolve(true),
      Math.max(0, startedAt + settleMs - Date.now()),
    );
    stopped.signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
  return { settled, stop: () => stopped.abort() };
}

interface ChatStartOptions {
  readonly lifecycle: ChatRunLifecycle;
  readonly events: Pick<ChatEvents, 'onThreadStarted'>;
  /** Starts from the same draft share their state, also across remounts. */
  readonly draftKey?: string;
  /** How long the new chat settles before the host should open the chat. */
  readonly settleMs: number;
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Runs once the view is gone, or right away when it already is: a started
 * chat's message leaves the composer only when the chat replaced the view.
 */
function useAfterUnmount() {
  const mounted = useRef(true);
  const pending = useRef<() => void>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.();
      pending.current = undefined;
    };
  }, []);
  const schedule = useCallback((run: () => void) => {
    if (mounted.current) pending.current = run;
    else run();
  }, []);
  const cancel = useCallback(() => {
    pending.current = undefined;
  }, []);
  return { schedule, cancel };
}

function useStartFailure() {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  return (error: unknown) => {
    if (!(error instanceof ChatStartError)) {
      showError(t('chat.errorSendMessage'));
      return;
    }
    const { ns, key } = error.messageKey;
    showError(ns === 'common' ? tCommon(key) : t(key));
  };
}

/** Hands the first message to the session's runs. */
function handOffFirstMessage(
  lifecycle: ChatRunLifecycle,
  threadId: string,
  request: ChatStartRequest,
) {
  const run = {
    threadId,
    text: request.text,
    images: request.images,
    skillId: request.skillId,
    voiceInput: request.voiceInput,
  };
  // Processing has no time limit: the chat opens and sends there once its
  // files are ready.
  if (request.sources.length > 0) lifecycle.deferThreadRun(run);
  else lifecycle.startThreadRun(run);
  return () => {
    lifecycle.cancelStartedThreadRun(threadId);
    lifecycle.cancelDeferredThreadRun(threadId);
  };
}

/** The draft's start in preparation, shared by every view of the draft. */
function useStartPreparation(lifecycle: ChatRunLifecycle, key: string) {
  const starts = chatStartsOf(lifecycle);
  const preparing = useSyncExternalStore(
    starts.subscribe,
    () => starts.isPending(key),
    () => starts.isPending(key),
  );
  const prepare = useMutation({
    // Outlook ties a chat to its email by watching this mutation; it settles
    // once the chat can take its first message.
    mutationKey: getThreadsControllerCreateMutationKey(),
    mutationFn: ({
      request,
      signal,
    }: {
      request: ChatStartRequest;
      signal: AbortSignal;
    }) => prepareChat(request, signal),
  });
  return { starts, preparing, prepare: prepare.mutateAsync };
}

/** A started chat the view still shows while it settles; Stop withdraws it. */
function useStartedChat(options: ChatStartOptions) {
  const { lifecycle } = options;
  const [started, setStarted] = useState<StartedChat>();
  const events = useLatest(options.events);

  function handOff(
    thread: GetThreadResponseDto,
    request: ChatStartRequest,
    startedAt: number,
  ) {
    const withdraw = handOffFirstMessage(lifecycle, thread.id, request);
    const settle = settleAfter(startedAt, options.settleMs);
    setStarted({
      stop: () => {
        settle.stop();
        withdraw();
      },
    });
    events.current.onThreadStarted?.({
      thread,
      origin: request.origin,
      skillId: request.skillId,
      sources: request.sources,
      knowledgeBases: request.knowledgeBases,
      integrations: request.integrations,
      settled: settle.settled,
    });
  }

  function stop() {
    started?.stop();
    setStarted(undefined);
  }

  return { isStarted: started !== undefined, handOff, stop };
}

/**
 * Starts a new chat: prepares it, hands its first message to the session's
 * runs (held while its files process), and reports it to the host, which
 * opens it. The view stays busy until it is replaced or the start stopped.
 */
export function useChatStart(options: ChatStartOptions) {
  const { lifecycle } = options;
  const instanceKey = useId();
  const key = options.draftKey ?? instanceKey;
  const { starts, preparing, prepare } = useStartPreparation(lifecycle, key);
  const started = useStartedChat(options);
  const afterUnmount = useAfterUnmount();
  const fail = useStartFailure();

  async function start(request: ChatStartRequest, accepted?: () => void) {
    const attempt = starts.begin(key);
    if (!attempt) return;
    const startedAt = Date.now();
    const session = lifecycle.getSessionSignal();
    const abort = () => attempt.abort();
    session.addEventListener('abort', abort, { once: true });
    try {
      const thread = await prepare({ request, signal: attempt.signal });
      attempt.signal.throwIfAborted();
      if (accepted) afterUnmount.schedule(accepted);
      started.handOff(thread, request, startedAt);
    } catch (error) {
      if (!attempt.signal.aborted) fail(error);
    } finally {
      session.removeEventListener('abort', abort);
      starts.finish(key, attempt);
    }
  }

  function stop() {
    starts.stop(key);
    afterUnmount.cancel();
    started.stop();
  }

  return { busy: preparing || started.isStarted, start, stop };
}
