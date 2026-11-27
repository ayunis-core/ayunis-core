import {
  useCallback,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from 'react';
import {
  ChatConversation,
  type ChatConfig,
  type ChatConversationAdapters,
  type ChatConversationHandle,
  type ChatConversationSlots,
  type ChatThreadSnapshot,
} from '@ayunis/chat/surface';
import { MessageImage } from '@ayunis/chat/messages';
import { threadRunEndpoints } from '@/features/chat-surface';
import {
  WEB_CHAT_DRAFTS,
  WEB_CHAT_TOUR_TARGETS,
  useWebChatEvents,
} from '@/widgets/chat-input';
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
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PiiMaskProvider, type PiiMaskEntry } from '@/widgets/markdown';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { useUnmaskPiiMask } from '@/pages/chat/api/useUnmaskPiiMask';
import { useRunErrorHandler } from '@/pages/chat/hooks/useRunErrorHandler';
import { useLetterheadChange } from '@/pages/chat/hooks/useLetterheadChange';
import { useSourceProcessingProgress } from '@/pages/chat/api/useSourceProcessingProgress';
import AppLayout from '@/layouts/app-layout';
import { useArtifactActions } from '@/pages/chat/hooks/useArtifactActions';
import { useChatThread } from '@/pages/chat/api/useChatThread';
import { useKnowledgeBaseAttachment } from '@/pages/chat/api/useKnowledgeBaseAttachment';
import { useMcpIntegrationAttachment } from '@/pages/chat/api/useMcpIntegrationAttachment';
import { ChatSidePanel } from './ChatSidePanel';
import { useChatSidePanelTransitions } from '@/pages/chat/hooks/useChatSidePanelTransitions';
import { useChatSidePanelState } from '@/pages/chat/hooks/useChatSidePanelState';
import SourceCitationController from './SourceCitationController';
import {
  ProductiveOutcomeProvider,
  useTrackProductiveOutcome,
} from '@/shared/lib/openpanel-outcomes';
import { useWebRunObserver } from '@/pages/chat/api/useWebRunObserver';
import { AgentRunTimeline } from '@/pages/chat/ui/agent-run-timeline';
import { chatToolCards } from '@/pages/chat/ui/agent-run-timeline/lib/tool-card-registrations';
import ResponseStartOrb from '@/pages/chat/ui/ResponseStartOrb';
import {
  sourceProcessingRun,
  sourceProcessingSteps,
} from '@/pages/chat/lib/source-processing-steps';
import LoadingAssistantBlock from '@/pages/chat/ui/LoadingAssistantBlock';
import { useApiImageSrc } from '@/shared/hooks/useApiImageSrc';
import { useWebConversationComposer } from './useWebConversationComposer';
import { WebAssistantActions } from './WebAssistantActions';
import RoutineNudgeNotice from './RoutineNudgeNotice';

// One element for every render: the timeline presentation is memoized on it.
const RESPONSE_START_ORB = <ResponseStartOrb />;

interface ChatPageProps {
  readonly sessionKey: string;
  readonly thread: Thread;
  readonly initialArtifactId?: string;
}

export default function ChatPage({
  sessionKey,
  thread: initialThread,
  initialArtifactId,
}: ChatPageProps) {
  const { t } = useTranslation('chat');
  const { confirm } = useConfirmation();
  const navigate = useNavigate();
  const isStreaming = useIsThreadRunActive(initialThread.id);
  const { thread, hasProcessingSources } = useChatThread(
    initialThread,
    isStreaming,
  );
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
    conversationRef,
    t,
  );
  const processingProgress = useSourceProcessingProgress(
    thread.id,
    hasProcessingSources,
  );
  const processingSteps = sourceProcessingSteps(
    thread.sources,
    processingProgress.data,
  );
  const knowledgeBases = useKnowledgeBaseAttachment({ threadId: thread.id });
  const integrations = useMcpIntegrationAttachment({ threadId: thread.id });
  const { unmaskPiiMask } = useUnmaskPiiMask({ threadId: thread.id });
  const handleRunError = useRunErrorHandler(thread.id);
  const observeRun = useWebRunObserver();
  const activeRuns = useActiveThreadRuns();
  const events = useWebChatEvents();
  const composer = useWebConversationComposer({
    thread,
    conversationRef,
    submission,
    hasProcessingSources,
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

  const config: ChatConfig = {
    sessionKey,
    transport: threadRunEndpoints,
    layout: 'page',
    drafts: WEB_CHAT_DRAFTS,
    knowledgeBases: composer.knowledgeBases,
    integrations: composer.integrations,
    toolCards: chatToolCards,
    tourTargets: WEB_CHAT_TOUR_TARGETS,
    events: {
      ...events,
      observeRun,
      onRunSettled: (id, outcome) =>
        submission.completeSubmission(id, outcome.failed),
    },
  };
  const slots: ChatConversationSlots = {
    header: (actions) => (
      <ChatHeader
        threadId={thread.id}
        threadTitle={current.title}
        isAnonymous={thread.isAnonymous}
        workspaceId={thread.workspaceId}
        origin={thread.origin}
        actions={actions}
        onRename={() => setTimeout(() => setRenameDialogOpen(true), 0)}
        onDelete={deleteThread}
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
    waiting: processingSteps.length > 0 && (
      <AgentRunTimeline unit={sourceProcessingRun(processingSteps)} />
    ),
    loading: !hasProcessingSources && <LoadingAssistantBlock />,
    pendingIndicator: RESPONSE_START_ORB,
    messageImage: renderWebMessageImage,
    messageNudge: renderWebMessageNudge,
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
                config={config}
                lifecycle={threadRunLifecycle}
                thread={thread}
                activeRun={activeRun}
                composer={composer.composer}
                conversationRef={conversationRef}
                pendingSubmission={submission.pendingSubmission}
                slots={slots}
                adapters={{
                  ...composer.adapters,
                  onRunError: handleRunError,
                  onMessageReceived: submission.clearPendingSubmission,
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
  conversationRef: RefObject<ChatConversationHandle | null>,
  t: ReturnType<typeof useTranslation<'chat'>>['t'],
) {
  const restore = useCallback(
    (submission: ThreadSubmission) =>
      conversationRef.current?.restoreFailedSubmission(
        submission.text,
        submission.images ?? [],
      ),
    [conversationRef],
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

/** Rendered inside `ProductiveOutcomeProvider`, which the outcome tracking reads. */
function TrackedChatConversation(
  props: ComponentProps<typeof ChatConversation>,
) {
  const trackOutcome = useTrackProductiveOutcome();
  const handleMessageCopied = useCallback(
    (role: 'user' | 'assistant') => {
      if (role === 'assistant') {
        trackOutcome({
          outcome_type: 'answer_copied',
          output_type: 'answer',
        });
      }
    },
    [trackOutcome],
  );
  const handleCodeCopied = useCallback(
    () => trackOutcome({ outcome_type: 'code_copied', output_type: 'code' }),
    [trackOutcome],
  );
  return (
    <ChatConversation
      {...props}
      config={{
        ...props.config,
        events: {
          ...props.config.events,
          onMessageCopied: handleMessageCopied,
          onCodeCopied: handleCodeCopied,
        },
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
