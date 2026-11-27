import { NewChatComposer, type NewChatStart } from '@ayunis/chat/surface';
import { AcademyGateNotice } from '@/widgets/academy-gate-notice';
import {
  WEB_CHAT_TOUR_TARGETS,
  useChatResourceSelection,
  useWebIntegrations,
  useWebKnowledgeBases,
} from '@/widgets/chat-input';
import {
  useInitiateChat,
  type CreateThreadOrigin,
} from '@/features/chat-initiation';
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
  origin?: CreateThreadOrigin;
  placeholder?: string;
}

/**
 * The full chat composer embedded in a page other than the new-chat page.
 * Sends through the same initiation flow, with the workspace and origin
 * fixed, and lands directly in the created chat.
 */
export function ChatStarter({
  workspaceId,
  origin,
  placeholder,
  selectedModelId,
}: Readonly<ChatStarterProps>) {
  const { initiateChat, cancel, isCreating } = useInitiateChat({
    settleAnimation: false,
  });
  const selectedKnowledgeBases =
    useChatResourceSelection<KnowledgeBaseSummary>();
  const selectedIntegrations = useChatResourceSelection<IntegrationSummary>();
  const knowledgeBases = useWebKnowledgeBases(selectedKnowledgeBases);
  const integrations = useWebIntegrations(selectedIntegrations);

  function handleStart(start: NewChatStart) {
    void initiateChat({
      message: start.text,
      images: start.images ?? [],
      ...(start.mode ? { mode: start.mode } : { modelId: start.modelId }),
      sources: [...start.sources],
      knowledgeBases: selectedKnowledgeBases.attached,
      mcpIntegrations: selectedIntegrations.attached,
      isAnonymous: start.isAnonymous,
      workspaceId,
      origin,
      skillId: start.skillId,
      voiceInput: start.voiceInput,
      onSourceStatus: start.onSourceStatus,
    });
  }

  return (
    <div>
      <AcademyGateNotice className="mb-2" />
      <NewChatComposer
        config={{
          layout: 'page',
          knowledgeBases,
          integrations,
          tourTargets: WEB_CHAT_TOUR_TARGETS,
        }}
        initialModel={selectedModelId}
        placeholder={placeholder}
        busy={isCreating}
        onStart={handleStart}
        onStop={cancel}
      />
    </div>
  );
}
