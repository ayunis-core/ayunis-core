import { useCallback, useRef, useState, type RefObject } from 'react';
import {
  Conversation,
  type ChatConfig,
  type ChatThreadState,
  type ConversationProps,
} from '@ayunis/chat/surface';
import { useThreadsControllerFindOne } from '@ayunis/api-client/endpoints';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { threadRunEndpoints } from '@/features/chat-surface';
import {
  WEB_CHAT_DRAFTS,
  WEB_CHAT_TOUR_TARGETS,
  useWebChatEvents,
  useWebIntegrations,
  useWebKnowledgeBases,
} from '@/widgets/chat-input';
import { CreateChatWorkspaceDialog } from '@/widgets/chat-workspace-menu';
import ChatInterfaceLayout from '@/layouts/chat-interface-layout/ui/ChatInterfaceLayout';
import type { Thread } from '@/pages/chat/model/openapi';
import { threadRunLifecycle } from '@/features/thread-run';
import { showError } from '@/shared/lib/toast';
import { PiiMaskProvider } from '@/widgets/markdown';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { useRunErrorHandler } from '@/pages/chat/hooks/useRunErrorHandler';
import { useLetterheadChange } from '@/pages/chat/hooks/useLetterheadChange';
import AppLayout from '@/layouts/app-layout';
import { useArtifactActions } from '@/pages/chat/hooks/useArtifactActions';
import { useKnowledgeBaseAttachment } from '@/pages/chat/api/useKnowledgeBaseAttachment';
import { useMcpIntegrationAttachment } from '@/pages/chat/api/useMcpIntegrationAttachment';
import { ChatSidePanel } from './ChatSidePanel';
import { useChatSidePanelTransitions } from '@/pages/chat/hooks/useChatSidePanelTransitions';
import { useChatSidePanelState } from '@/pages/chat/hooks/useChatSidePanelState';
import { useContextHintSummary } from '@/pages/chat/hooks/useContextHintSummary';
import { useWebConversationData } from '@/pages/chat/hooks/useWebConversationData';
import {
  ProductiveOutcomeProvider,
  useTrackProductiveOutcome,
} from '@/shared/lib/openpanel-outcomes';
import { useWebRunObserver } from '@/pages/chat/api/useWebRunObserver';
import { chatToolCards } from '@/pages/chat/ui/agent-run-timeline/lib/tool-card-registrations';

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
  const { data: thread = initialThread } = useThreadsControllerFindOne(
    initialThread.id,
  );
  const artifactPanelRef = useRef<ArtifactPanelHandle>(null);
  const [threadMasks, setThreadMasks] =
    useState<Pick<ChatThreadState, 'id' | 'piiMasks'>>();
  const handleThreadState = useCallback(
    ({ id, piiMasks }: ChatThreadState) =>
      setThreadMasks((previous) =>
        previous?.id === id && previous.piiMasks === piiMasks
          ? previous
          : { id, piiMasks },
      ),
    [],
  );
  const [workspaceFor, setWorkspaceFor] = useState<string>();
  const sidePanel = useChatSidePanel(
    thread,
    initialArtifactId,
    artifactPanelRef,
  );
  const config = useWebChatConfig(thread, sessionKey, {
    sidePanel,
    onThreadState: handleThreadState,
    onCreateWorkspace: setWorkspaceFor,
  });
  const masks =
    threadMasks?.id === thread.id ? threadMasks.piiMasks : thread.piiMasks;

  return (
    <AppLayout>
      <ProductiveOutcomeProvider threadId={thread.id}>
        <ChatInterfaceLayout
          sidePanel={
            sidePanel.panel && (
              <PiiMaskProvider masks={masks}>{sidePanel.panel}</PiiMaskProvider>
            )
          }
        >
          <TrackedConversation
            config={config}
            lifecycle={threadRunLifecycle}
            threadId={thread.id}
          />
        </ChatInterfaceLayout>
      </ProductiveOutcomeProvider>
      <CreateChatWorkspaceDialog
        threadId={workspaceFor ?? thread.id}
        open={workspaceFor !== undefined}
        onOpenChange={(open) => {
          if (!open) setWorkspaceFor(undefined);
        }}
      />
    </AppLayout>
  );
}

interface WebChatConfigOptions {
  readonly sidePanel: ReturnType<typeof useChatSidePanel>;
  readonly onThreadState: (thread: ChatThreadState) => void;
  readonly onCreateWorkspace: (threadId: string) => void;
}

function useWebChatConfig(
  thread: Thread,
  sessionKey: string,
  { sidePanel, onThreadState, onCreateWorkspace }: WebChatConfigOptions,
): ChatConfig {
  const { transitions } = sidePanel;
  const data = useWebConversationData(thread, onCreateWorkspace);
  const contextSummary = useContextHintSummary(thread.id, thread.workspaceId);
  return {
    sessionKey,
    transport: threadRunEndpoints,
    layout: 'page',
    drafts: WEB_CHAT_DRAFTS,
    ...useWebThreadResources(thread),
    ...data,
    artifactPanel: {
      open: sidePanel.isOpen,
      toggle: transitions.toggleArtifactPanel,
    },
    contextHint: {
      summary: contextSummary,
      open: () => transitions.changeTab('context'),
    },
    toolCards: chatToolCards,
    tourTargets: WEB_CHAT_TOUR_TARGETS,
    events: {
      ...useWebConversationEvents(),
      onThreadState,
      onOpenArtifact: transitions.openArtifactPanel,
    },
  };
}

function useWebThreadResources(thread: Thread) {
  const knowledgeBases = useKnowledgeBaseAttachment({ threadId: thread.id });
  const integrations = useMcpIntegrationAttachment({ threadId: thread.id });
  return {
    knowledgeBases: useWebKnowledgeBases({
      attached: thread.knowledgeBases,
      attach: (knowledgeBase) =>
        knowledgeBases.addKnowledgeBase(knowledgeBase.id),
      detach: knowledgeBases.removeKnowledgeBase,
    }),
    integrations: useWebIntegrations({
      attached: thread.mcpIntegrations,
      attach: (integration) => integrations.addIntegration(integration.id),
      detach: integrations.removeIntegration,
    }),
  };
}

function useWebConversationEvents(): ChatConfig['events'] {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();
  const router = useRouter();
  return {
    ...useWebChatEvents(),
    observeRun: useWebRunObserver(),
    onRunError: useRunErrorHandler(),
    onError: (error) => {
      console.error('Error in shared chat conversation:', error);
      showError(t('chat.errorSendMessage'));
    },
    onThreadDeleted: () => {
      void router.invalidate();
      void navigate({ to: '/chat' });
    },
  };
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
function TrackedConversation(props: ConversationProps) {
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
    <Conversation
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
