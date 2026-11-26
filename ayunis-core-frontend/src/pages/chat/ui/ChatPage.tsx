import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from 'react';
import {
  ChatConversation,
  type ChatConversationAdapters,
  type ChatConversationHandle,
  type ChatConversationSlots,
  type ChatThreadSnapshot,
} from '@ayunis/chat/surface';
import { MessageImage } from '@ayunis/chat/messages';
import { useAppChatSurface } from '@/features/chat-surface';
import ChatInterfaceLayout from '@/layouts/chat-interface-layout/ui/ChatInterfaceLayout';
import { ChatContextHint } from '@/pages/chat/ui/ChatContextHint';
import ChatHeader, { ChatArtifactPanelButton } from './ChatHeader';
import type { Thread } from '@/pages/chat/model/openapi';
import { useThreadSubmissionState } from '@/pages/chat/hooks/useThreadSubmissionState';
import {
  type ThreadSubmission,
  threadRunLifecycle,
  useActiveThreadRuns,
  useDeleteThread,
  useIsThreadRunActive,
} from '@/features/thread-run';
import { showError } from '@/shared/lib/toast';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { RenameThreadDialog } from '@/widgets/rename-thread-dialog';
import { useAcademyAccessStatus } from '@/features/academy';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Markdown,
  PiiMaskProvider,
  type PiiMaskEntry,
} from '@/widgets/markdown';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { useUnmaskPiiMask } from '@/pages/chat/api/useUnmaskPiiMask';
import { useRunErrorHandler } from '@/pages/chat/hooks/useRunErrorHandler';
import { useLetterheadChange } from '@/pages/chat/hooks/useLetterheadChange';
import { useChatFiles } from '@/pages/chat/api/useChatFiles';
import AppLayout from '@/layouts/app-layout';
import { useArtifactActions } from '@/pages/chat/hooks/useArtifactActions';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useChatThread } from '@/pages/chat/api/useChatThread';
import { useKnowledgeBaseAttachment } from '@/pages/chat/api/useKnowledgeBaseAttachment';
import { useMcpIntegrationAttachment } from '@/pages/chat/api/useMcpIntegrationAttachment';
import { ChatSidePanel } from './ChatSidePanel';
import { useChatSidePanelTransitions } from '@/pages/chat/hooks/useChatSidePanelTransitions';
import { useChatSidePanelState } from '@/pages/chat/hooks/useChatSidePanelState';
import SourceCitationController from './SourceCitationController';
import { findThreadModel } from '@/pages/chat/lib/find-thread-model';
import {
  ProductiveOutcomeProvider,
  useTrackProductiveOutcome,
} from '@/shared/lib/openpanel-outcomes';
import { useWebRunObserver } from '@/pages/chat/api/useWebRunObserver';
import {
  AgentRunTimeline,
  appTimelinePresentation,
} from '@/pages/chat/ui/agent-run-timeline';
import { sourceProcessingRun } from '@/pages/chat/lib/source-processing-steps';
import LoadingAssistantBlock from '@/pages/chat/ui/LoadingAssistantBlock';
import { useApiImageSrc } from '@/shared/hooks/useApiImageSrc';
import { useWebConversationComposer } from './useWebConversationComposer';
import { WebAssistantActions } from './WebAssistantActions';
import RoutineNudgeNotice from './RoutineNudgeNotice';

interface ChatPageProps {
  readonly sessionKey: string;
  readonly thread: Thread;
  readonly isEmbeddingModelEnabled: boolean;
  readonly initialArtifactId?: string;
}

export default function ChatPage({
  sessionKey,
  thread: initialThread,
  isEmbeddingModelEnabled,
  initialArtifactId,
}: ChatPageProps) {
  const { t } = useTranslation('chat');
  const config = useAppChatSurface();
  const { confirm } = useConfirmation();
  const navigate = useNavigate();
  const modelQuery = usePermittedModels();
  const isStreaming = useIsThreadRunActive(initialThread.id);
  const { thread, hasProcessingSources } = useChatThread(
    initialThread,
    isStreaming,
  );
  const selectedModel = findThreadModel(modelQuery.models, thread);
  const isModelUnavailable = useMemo(() => {
    if (!thread.permittedModelId) return false;
    return !modelQuery.isLoading && !modelQuery.error && !selectedModel;
  }, [thread.permittedModelId, modelQuery, selectedModel]);
  const conversationRef = useRef<ChatConversationHandle>(null);
  const artifactPanelRef = useRef<ArtifactPanelHandle>(null);
  const [renderedThread, setRenderedThread] =
    useState<Pick<ChatThreadSnapshot, 'id' | 'title' | 'piiMasks'>>();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const current = renderedThread?.id === thread.id ? renderedThread : thread;
  const sidePanel = useChatSidePanel(
    thread,
    initialArtifactId,
    artifactPanelRef,
  );
  const submission = useWebSubmission(
    thread.id,
    isStreaming,
    isModelUnavailable,
    conversationRef,
    t,
  );
  const chatFiles = useChatFiles(thread, hasProcessingSources);
  const knowledgeBases = useKnowledgeBaseAttachment({ threadId: thread.id });
  const integrations = useMcpIntegrationAttachment({ threadId: thread.id });
  const { isGated: isAcademyGated } = useAcademyAccessStatus();
  const { unmaskPiiMask } = useUnmaskPiiMask({ threadId: thread.id });
  const handleRunError = useRunErrorHandler(thread.id);
  const observeRun = useWebRunObserver();
  const activeRuns = useActiveThreadRuns();
  const handleNewChat = useCallback(
    () => void navigate({ to: '/chat' }),
    [navigate],
  );
  const composer = useWebConversationComposer({
    thread,
    conversationRef,
    submission,
    files: chatFiles,
    hasProcessingSources,
    isAcademyGated,
    isEmbeddingModelEnabled,
    model: selectedModel,
    isModelUnavailable,
    onNewChat: handleNewChat,
    addKnowledgeBase: knowledgeBases.addKnowledgeBase,
    removeKnowledgeBase: knowledgeBases.removeKnowledgeBase,
    addIntegration: integrations.addIntegration,
    removeIntegration: integrations.removeIntegration,
  });
  const { deleteChat } = useDeleteThread({
    onBeforeDelete: () => submission.resetSubmission(thread.id),
    onSuccess: () => void navigate({ to: '/chat' }),
    onError: (error) => {
      console.error('Failed to delete thread', error);
      showError(t('chat.errorDeleteThread'));
    },
  });

  const handleUnmaskRequest = useCallback(
    (entry: PiiMaskEntry) => {
      confirm({
        title: t('chat.piiMask.unmaskTitle', { value: entry.value }),
        description: t('chat.piiMask.unmaskDescription'),
        confirmText: t('chat.piiMask.unmaskConfirm'),
        cancelText: t('chat.piiMask.unmaskCancel'),
        variant: 'destructive',
        onConfirm: () => unmaskPiiMask(entry.id),
      });
    },
    [confirm, t, unmaskPiiMask],
  );
  const { startSubmission, clearPendingSubmission } = submission;
  const handleStartedRun = useCallback<
    NonNullable<ChatConversationAdapters['onStartedRun']>
  >(
    (id, run, messageAlreadyLoaded) => {
      startSubmission(id, { text: run.text, images: run.images });
      if (messageAlreadyLoaded) clearPendingSubmission(id);
    },
    [startSubmission, clearPendingSubmission],
  );
  const handleThreadState = useCallback(
    ({ id, title, piiMasks }: ChatThreadSnapshot) => {
      setRenderedThread((previous) => {
        if (
          previous?.id === id &&
          previous.title === title &&
          previous.piiMasks === piiMasks
        ) {
          return previous;
        }
        return { id, title, piiMasks };
      });
    },
    [],
  );

  function deleteThread() {
    confirm({
      title: t('chat.deleteThreadTitle'),
      description: t('chat.deleteThreadDescription'),
      confirmText: t('chat.deleteText'),
      cancelText: t('chat.cancelText'),
      variant: 'destructive',
      onConfirm: () => deleteChat(thread.id),
    });
  }

  const slots: ChatConversationSlots = {
    ...composer.slots,
    header: (actions) => (
      <ChatHeader
        threadId={thread.id}
        threadTitle={current.title}
        isAnonymous={thread.isAnonymous}
        workspaceId={thread.workspaceId}
        origin={thread.origin}
        actions={actions}
        onRename={
          config.capabilities.rename
            ? () => setTimeout(() => setRenameDialogOpen(true), 0)
            : undefined
        }
        onDelete={config.capabilities.delete ? deleteThread : undefined}
      />
    ),
    actions: (
      <ChatArtifactPanelButton
        open={sidePanel.isOpen}
        onToggle={sidePanel.transitions.toggleArtifactPanel}
      />
    ),
    onOpenArtifact: sidePanel.transitions.openArtifactPanel,
    contextHint: (
      <ChatContextHint
        threadId={thread.id}
        workspaceId={thread.workspaceId}
        onOpen={() => sidePanel.transitions.changeTab('context')}
      />
    ),
    waiting: chatFiles.processingSteps.length > 0 && (
      <AgentRunTimeline unit={sourceProcessingRun(chatFiles.processingSteps)} />
    ),
    loading: !hasProcessingSources && <LoadingAssistantBlock />,
    messageImage: renderWebMessageImage,
    messageNudge: renderWebMessageNudge,
    messageMarkdown: Markdown,
    assistantActions: renderWebAssistantActions,
  };
  const activeRun = {
    run: activeRuns.runsByThreadId.get(thread.id),
    dataUpdatedAt: activeRuns.dataUpdatedAt,
    isFetching: activeRuns.isFetching,
  };

  return (
    <AppLayout>
      <ProductiveOutcomeProvider threadId={thread.id}>
        <PiiMaskProvider
          masks={current.piiMasks}
          onUnmaskRequest={handleUnmaskRequest}
        >
          <SourceCitationController key={thread.id} threadId={thread.id}>
            <ChatInterfaceLayout sidePanel={sidePanel.panel}>
              <TrackedChatConversation
                sessionKey={sessionKey}
                compactComposer
                config={{ ...config, capabilities: composer.capabilities }}
                lifecycle={threadRunLifecycle}
                thread={thread}
                activeRun={activeRun}
                composer={composer.composer}
                conversationRef={conversationRef}
                pendingSubmission={submission.pendingSubmission}
                timeline={appTimelinePresentation}
                slots={slots}
                adapters={{
                  ...composer.adapters,
                  observeRun,
                  onRunError: handleRunError,
                  onMessageReceived: submission.clearPendingSubmission,
                  onRunSettled: (id, outcome) =>
                    submission.completeSubmission(id, outcome.failed),
                  onStartedRun: handleStartedRun,
                  onThreadState: handleThreadState,
                  onPiiUnmaskRequest: handleUnmaskRequest,
                  onRunTransportError: (error) => {
                    console.error('Error in shared chat conversation:', error);
                    showError(t('chat.errorSendMessage'));
                  },
                }}
              />
            </ChatInterfaceLayout>
          </SourceCitationController>
        </PiiMaskProvider>
      </ProductiveOutcomeProvider>
      <RenameThreadDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        threadId={thread.id}
        currentTitle={current.title ?? null}
      />
    </AppLayout>
  );
}

function useWebSubmission(
  threadId: string,
  isStreaming: boolean,
  isModelUnavailable: boolean,
  conversationRef: RefObject<ChatConversationHandle | null>,
  t: ReturnType<typeof useTranslation<'chat'>>['t'],
) {
  const restore = useCallback(
    (submission: ThreadSubmission) => {
      if (isModelUnavailable) return undefined;
      return conversationRef.current?.restoreFailedSubmission(
        submission.text,
        submission.images ?? [],
      );
    },
    [conversationRef, isModelUnavailable],
  );
  const blocked = useCallback(
    () => showError(t('chat.errorRestoreFailedSubmission')),
    [t],
  );
  return useThreadSubmissionState({
    threadId,
    isStreaming,
    restoreFailedSubmission: restore,
    onRestoreBlocked: blocked,
  });
}

function useChatSidePanel(
  thread: Thread,
  initialArtifactId: string | undefined,
  artifactPanelRef: RefObject<ArtifactPanelHandle | null>,
) {
  const state = useChatSidePanelState(thread.id, initialArtifactId);
  const actions = useArtifactActions(
    thread.id,
    initialArtifactId,
    thread.workspaceId,
  );
  const { handleLetterheadChange } = useLetterheadChange({
    artifactId: actions.artifactPanel.artifact?.id ?? '',
    threadId: thread.id,
    workspaceId: thread.workspaceId,
  });
  const transitions = useChatSidePanelTransitions({
    artifactPanelRef,
    isArtifactDetailOpen: state.view === 'artifact-detail',
    openArtifact: state.openArtifact,
    toggleArtifactPanel: state.toggle,
    changeTab: state.openTab,
  });
  const panel = state.isOpen ? (
    <ChatSidePanel
      threadId={thread.id}
      view={state.view}
      artifactPanelRef={artifactPanelRef}
      artifactPanelProps={{
        ...actions.artifactPanel,
        onBack: () => state.openTab('artifacts'),
        onClose: state.close,
        onSave: actions.handleSaveArtifact,
        onRevert: actions.handleRevertArtifact,
        onExport: actions.handleExportArtifact,
        onLetterheadChange: handleLetterheadChange,
        isExporting: actions.isExporting,
      }}
      onSelectArtifact={transitions.openArtifactPanel}
      onTabChange={transitions.changeTab}
      onClose={transitions.toggleArtifactPanel}
    />
  ) : undefined;
  return { isOpen: state.isOpen, transitions, panel };
}

function TrackedChatConversation(
  props: ComponentProps<typeof ChatConversation>,
) {
  const trackOutcome = useTrackProductiveOutcome();
  const upstreamOnMessageCopied = props.adapters?.onMessageCopied;
  const handleMessageCopied = useCallback<
    NonNullable<ChatConversationAdapters['onMessageCopied']>
  >(
    (role) => {
      upstreamOnMessageCopied?.(role);
      if (role === 'assistant') {
        trackOutcome({
          outcome_type: 'answer_copied',
          output_type: 'answer',
        });
      }
    },
    [trackOutcome, upstreamOnMessageCopied],
  );
  return (
    <ChatConversation
      {...props}
      adapters={{
        ...props.adapters,
        onMessageCopied: handleMessageCopied,
      }}
    />
  );
}

const renderWebAssistantActions: NonNullable<
  ChatConversationSlots['assistantActions']
> = (unit, contentRef) => (
  <WebAssistantActions unit={unit} contentRef={contentRef} />
);

const renderWebMessageImage: NonNullable<
  ChatConversationSlots['messageImage']
> = (message, image) => (
  <AuthenticatedMessageImage
    key={`${message.id}-${image.index}`}
    path={`/threads/${message.threadId}/messages/${message.id}/images/${image.index}`}
    altText={image.altText}
  />
);

const renderWebMessageNudge: NonNullable<
  ChatConversationSlots['messageNudge']
> = (text) => <RoutineNudgeNotice text={text} />;

function AuthenticatedMessageImage({
  path,
  altText,
}: Readonly<{ path: string; altText?: string }>) {
  return <MessageImage imageUrl={useApiImageSrc(path)} altText={altText} />;
}
