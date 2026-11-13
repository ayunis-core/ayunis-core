import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  getWorkspacesControllerFindAllQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  threadKnowledgeBasesControllerAddKnowledgeBase,
  threadMcpIntegrationsControllerAddMcpIntegration,
  useThreadsControllerCreate,
} from '@/shared/api/generated/ayunisCoreAPI';
import { bindAttachments } from '@/features/chat-attachments';
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
}

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

    queryClient.setQueryData(
      getThreadsControllerFindOneQueryKey(threadId),
      thread,
    );
    const run = { threadId, text: message, images, skillId, voiceInput };
    // Processing has no time limit, so the chat opens right after the upload
    // and sends the message there once its files are processed.
    if (sources.length > 0) {
      deferThreadRun(run);
      bindAttachments(
        sources.map((source) => source.id),
        threadId,
        queryClient,
      );
    } else startThreadRun(run);
    startedThreadIdRef.current = threadId;

    if (sources.length === 0) await waitForSettleAnimation();

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
