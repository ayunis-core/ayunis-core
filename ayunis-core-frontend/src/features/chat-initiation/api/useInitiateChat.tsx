import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  getWorkspacesControllerFindAllQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  threadKnowledgeBasesControllerAddKnowledgeBase,
  threadMcpIntegrationsControllerAddMcpIntegration,
  threadSourcesControllerCompleteUpload,
  threadSourcesControllerCreateUpload,
  useThreadsControllerCreate,
} from '@/shared/api/generated/ayunisCoreAPI';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { uploadSourceFile } from '@/shared/lib/source-upload';
import { showError } from '@/shared/lib/toast';
import {
  threadInteractionContext,
  trackOpenPanelEvent,
} from '@/shared/lib/openpanel-events';
import {
  cancelDeferredThreadRun,
  cancelStartedThreadRun,
  deferThreadRun,
  startThreadRun,
} from '@/features/thread-run';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CreateThreadDto,
  GetThreadResponseDto,
  ModelMode,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import type { SourceResponseDtoType } from '@/shared/api';

/** Compose slide duration (matches --new-chat-settle-duration in CSS) */
const NEW_CHAT_SETTLE_MS = 1450;
/** Disclaimer soft fade after slide (matches --new-chat-disclaimer-fade-duration) */
const NEW_CHAT_DISCLAIMER_FADE_MS = 900;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PendingSource {
  id: string;
  name: string;
  type: SourceResponseDtoType;
  file: File;
}

export type SourceUploadStatus =
  /** `progress` is the fraction of bytes stored so far, 0..1. */
  | { kind: 'uploading'; progress: number }
  | { kind: 'processing' }
  | { kind: 'failed'; message: string };

type PendingImageFile = { file: File; altText?: string };

interface InitiateChatParams {
  message: string;
  images: PendingImageFile[];
  modelId?: string;
  /** Start the chat in a mode; the backend binds the model it resolves to. */
  mode?: ModelMode;
  sources: PendingSource[];
  knowledgeBases: KnowledgeBaseSummary[];
  mcpIntegrations: IntegrationSummary[];
  isAnonymous: boolean;
  /** Files the new chat under a workspace ("Projekt"). */
  workspaceId?: string;
  /** Starts a chat about this notification ("Chat about this"). */
  sourceNotificationId?: string;
  skillId?: string;
  /** The prompt contains text from a successful transcription. */
  voiceInput?: boolean;
  /** Reports per-source progress so the page can render upload/processing
   *  state on each chip. */
  onSourceStatus?: (sourceId: string, status: SourceUploadStatus) => void;
}

export const useInitiateChat = (options?: {
  onSuccess?: () => void;
  /**
   * The new-chat page plays a settle animation while the thread is created
   * and delays navigation until it finished; callers without that layout
   * (e.g. the workspace chat starter) pass `false` to navigate immediately.
   */
  settleAnimation?: boolean;
}) => {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createThreadMutation = useThreadsControllerCreate();
  const [isInitiatingChat, setIsInitiatingChat] = useState(false);
  const [isAttachingResources, setIsAttachingResources] = useState(false);
  const [isSettlingLayout, setIsSettlingLayout] = useState(false);
  const isInitiatingChatRef = useRef(false);
  const settleStartedAtRef = useRef<number | null>(null);
  const startedThreadIdRef = useRef<string | null>(null);

  // Cancellation flag is a ref because we want `cancel()` to flip it
  // synchronously and have any in-flight pipeline observe it on the next
  // checkpoint, without dragging it through the dependency graph.
  const cancelledRef = useRef(false);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const settleAnimation = options?.settleAnimation ?? true;

  function beginSettleAnimation(): void {
    if (!settleAnimation) return;
    settleStartedAtRef.current = Date.now();
    setIsSettlingLayout(true);
  }

  function endSettleAnimation(): void {
    settleStartedAtRef.current = null;
    setIsSettlingLayout(false);
  }

  function stopInitiatingChat(): void {
    isInitiatingChatRef.current = false;
    setIsInitiatingChat(false);
    endSettleAnimation();
  }

  async function waitForSettleAnimation(): Promise<void> {
    const startedAt = settleStartedAtRef.current;
    if (startedAt === null) return;
    const elapsed = Date.now() - startedAt;
    const totalMs = NEW_CHAT_SETTLE_MS + NEW_CHAT_DISCLAIMER_FADE_MS + 80;
    const remaining = totalMs - elapsed;
    if (remaining > 0) {
      await sleep(remaining);
    }
  }

  async function uploadOneSource(
    threadId: string,
    source: PendingSource,
    signal: AbortSignal,
    onSourceStatus?: (id: string, status: SourceUploadStatus) => void,
  ): Promise<void> {
    try {
      const { file } = source;
      let reported = 0;
      await uploadSourceFile(
        file,
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
          // Bytes still in flight after Stop must not revive the chip.
          if (cancelledRef.current) return;
          // A retried part reports from zero again; never show it going back.
          reported = Math.max(reported, progress);
          onSourceStatus?.(source.id, {
            kind: 'uploading',
            progress: reported,
          });
        },
      );
      // Stop may have landed while the last bytes were on the wire.
      if (!cancelledRef.current) {
        onSourceStatus?.(source.id, { kind: 'processing' });
      }
    } catch (error) {
      // After a cancel the page has already reset the chips; keep them so.
      if (!cancelledRef.current) {
        onSourceStatus?.(source.id, {
          kind: 'failed',
          message: error instanceof Error ? error.message : 'Upload failed',
        });
      }
      throw error;
    }
  }

  /** Returns true on success, false on user-visible failure (toast already
   *  shown). Caller should bail on false. */
  async function uploadAllSources(
    threadId: string,
    sources: PendingSource[],
    onSourceStatus?: (id: string, status: SourceUploadStatus) => void,
  ): Promise<boolean> {
    sources.forEach((s) =>
      onSourceStatus?.(s.id, { kind: 'uploading', progress: 0 }),
    );
    // No wall-clock limit: the session's server-side expiry bounds a slow
    // transfer, and a 25 MB file on a weak uplink needs minutes. Only the
    // user's cancel aborts it.
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    const uploads = sources.map((source) =>
      uploadOneSource(threadId, source, controller.signal, onSourceStatus),
    );
    try {
      await Promise.all(uploads);
      return true;
    } catch (error) {
      // The chat is not created without all of its files: stop the siblings
      // instead of letting them finish into a thread that is abandoned, and
      // wait for their abort rejections so none surfaces as unhandled.
      controller.abort();
      await Promise.allSettled(uploads);
      if (cancelledRef.current) return false;
      console.error('Failed to upload sources:', error);
      handleSourceUploadError(error, tCommon);
      return false;
    }
  }

  /** Returns true on success, false on user-visible failure (toast shown). */
  async function attachKnowledgeBases(
    threadId: string,
    knowledgeBases: KnowledgeBaseSummary[],
    isCancelled: () => boolean,
  ): Promise<boolean> {
    for (const kb of knowledgeBases) {
      if (isCancelled()) return false;
      try {
        await threadKnowledgeBasesControllerAddKnowledgeBase(threadId, kb.id);
      } catch (error) {
        console.error('Failed to attach knowledge base:', error);
        showError(t('chat.errorAddKnowledgeBase'));
        return false;
      }
    }
    return true;
  }

  /** Returns true on success, false on user-visible failure (toast shown). */
  async function attachIntegrations(
    threadId: string,
    mcpIntegrations: IntegrationSummary[],
    isCancelled: () => boolean,
  ): Promise<boolean> {
    for (const integration of mcpIntegrations) {
      if (isCancelled()) return false;
      try {
        await threadMcpIntegrationsControllerAddMcpIntegration(
          threadId,
          integration.id,
        );
      } catch (error) {
        console.error('Failed to attach integration:', error);
        showError(t('chat.errorAddIntegration'));
        return false;
      }
    }
    return true;
  }

  async function initiateChat(params: InitiateChatParams): Promise<void> {
    const {
      modelId,
      mode,
      sources,
      knowledgeBases,
      mcpIntegrations,
      isAnonymous,
      workspaceId,
      sourceNotificationId,
      onSourceStatus,
    } = params;
    if (isInitiatingChatRef.current) return;
    isInitiatingChatRef.current = true;
    setIsInitiatingChat(true);
    cancelledRef.current = false;
    startedThreadIdRef.current = null;
    beginSettleAnimation();
    const isCancelled = () => cancelledRef.current;

    let thread;
    try {
      const createThreadData: CreateThreadDto = {
        modelId,
        mode,
        isAnonymous,
        workspaceId,
        sourceNotificationId,
      };
      thread = await createThreadMutation.mutateAsync({
        data: createThreadData,
      });
    } catch (error) {
      console.error('Failed to create thread:', error);
      showError(t(threadCreationErrorKey(error)));
      stopInitiatingChat();
      return;
    }
    if (isCancelled()) {
      stopInitiatingChat();
      return;
    }

    if (
      sources.length === 0 &&
      knowledgeBases.length === 0 &&
      mcpIntegrations.length === 0
    ) {
      await finalizeAndNavigate(thread, params);
      return;
    }

    setIsAttachingResources(true);
    try {
      if (sources.length > 0) {
        const ok = await uploadAllSources(thread.id, sources, onSourceStatus);
        if (!ok || isCancelled()) {
          stopInitiatingChat();
          return;
        }
      }

      const kbOk = await attachKnowledgeBases(
        thread.id,
        knowledgeBases,
        isCancelled,
      );
      if (!kbOk || isCancelled()) {
        stopInitiatingChat();
        return;
      }

      const integrationsOk = await attachIntegrations(
        thread.id,
        mcpIntegrations,
        isCancelled,
      );
      if (!integrationsOk || isCancelled()) {
        stopInitiatingChat();
        return;
      }

      await finalizeAndNavigate(thread, params);
    } finally {
      setIsAttachingResources(false);
    }
  }

  async function finalizeAndNavigate(
    thread: GetThreadResponseDto,
    params: InitiateChatParams,
  ): Promise<void> {
    const { message, images, skillId, workspaceId, voiceInput, sources } =
      params;
    const threadId = thread.id;
    if (cancelledRef.current) {
      stopInitiatingChat();
      return;
    }

    const run = { threadId, text: message, images, skillId, voiceInput };
    // Processing has no time limit, so the chat opens right after the upload
    // and sends the message there once its files are processed.
    if (sources.length > 0) deferThreadRun(run);
    else startThreadRun(run);
    startedThreadIdRef.current = threadId;

    await waitForSettleAnimation();

    // Cancel may fire while the settle animation is running.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ref toggled from cancel()
    if (cancelledRef.current) {
      stopInitiatingChat();
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindAllQueryKey(),
    });
    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindOneQueryKey(threadId),
    });
    if (workspaceId) {
      // The workspace list is ordered by chat activity, so it must refetch.
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
      });
    }
    trackChatStarted(thread, params);
    options?.onSuccess?.();

    // Keep settling state until unmount — avoids snapping back to --idle transform.
    // No view transition: positions are aligned manually; morph caused the end snap.
    void navigate({ to: '/chats/$threadId', params: { threadId } });
  }

  function cancel() {
    cancelledRef.current = true;
    uploadAbortRef.current?.abort();
    if (startedThreadIdRef.current) {
      cancelStartedThreadRun(startedThreadIdRef.current);
      cancelDeferredThreadRun(startedThreadIdRef.current);
    }
    setIsAttachingResources(false);
    stopInitiatingChat();
  }

  return {
    initiateChat,
    cancel,
    isCreating:
      isInitiatingChat ||
      isSettlingLayout ||
      createThreadMutation.isPending ||
      isAttachingResources,
    error: createThreadMutation.error,
  };
};

function trackChatStarted(
  thread: GetThreadResponseDto,
  { sources, knowledgeBases, mcpIntegrations, skillId }: InitiateChatParams,
): void {
  trackOpenPanelEvent('chat_started', {
    ...threadInteractionContext({
      ...thread,
      sources,
      knowledgeBases,
      mcpIntegrations,
    }),
    has_skill: Boolean(skillId),
  });
}

function threadCreationErrorKey(error: unknown): string {
  try {
    if (extractErrorData(error).code === 'MODEL_MODE_UNAVAILABLE') {
      return 'chat.errorModeUnavailable';
    }
  } catch {
    // Non-Axios failure: fall through to the generic message.
  }
  return 'chat.errorSendMessage';
}
