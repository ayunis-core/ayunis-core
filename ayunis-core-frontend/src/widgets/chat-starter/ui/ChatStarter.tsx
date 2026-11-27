import { NewChatComposer, type ChatStartOrigin } from '@ayunis/chat/surface';
import {
  WEB_CHAT_TOUR_TARGETS,
  useChatResourceSelection,
  useWebChatEvents,
  useWebIntegrations,
  useWebKnowledgeBases,
} from '@/widgets/chat-input';
import { useWebChatStarted } from '@/features/chat-initiation';
import { threadRunLifecycle } from '@/features/thread-run';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';

/** What a route loads before the composer renders, so its model is preselected. */
export interface ChatStarterDefaults {
  /** A model id or `mode:<mode>`. */
  selectedModelId?: string;
}

interface ChatStarterProps extends ChatStarterDefaults {
  workspaceId?: string;
  origin?: ChatStartOrigin;
  placeholder?: string;
}

/**
 * The full chat composer embedded in a page other than the new-chat page.
 * The package starts the chat with the workspace and origin fixed, and it
 * opens right away.
 */
export function ChatStarter({
  workspaceId,
  origin,
  placeholder,
  selectedModelId,
}: Readonly<ChatStarterProps>) {
  const selectedKnowledgeBases =
    useChatResourceSelection<KnowledgeBaseSummary>();
  const selectedIntegrations = useChatResourceSelection<IntegrationSummary>();
  const knowledgeBases = useWebKnowledgeBases(selectedKnowledgeBases);
  const integrations = useWebIntegrations(selectedIntegrations);
  const onThreadStarted = useWebChatStarted();
  const events = useWebChatEvents();

  return (
    <NewChatComposer
      config={{
        layout: 'page',
        knowledgeBases,
        integrations,
        tourTargets: WEB_CHAT_TOUR_TARGETS,
        events: { ...events, onThreadStarted },
      }}
      lifecycle={threadRunLifecycle}
      workspaceId={workspaceId}
      origin={origin}
      initialModel={selectedModelId}
      placeholder={placeholder}
    />
  );
}
