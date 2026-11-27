import type { ChatViewConfig, ChatWorkspaces } from '@ayunis/chat/surface';
import { threadRunEndpoints } from '@/features/chat-surface';
import { useWebChatStarted } from '@/features/chat-initiation';
import { useWorkspaces } from '@/features/workspaces';
import {
  WEB_CHAT_TOUR_TARGETS,
  useChatResourceSelection,
  useWebChatEvents,
  useWebIntegrations,
  useWebKnowledgeBases,
} from '@/widgets/chat-input';
import { useAssignThreadToWorkspace } from '@/widgets/chat-workspace-menu';
import type {
  IntegrationSummary,
  KnowledgeBaseSummary,
} from '@/shared/contexts/chat/chatContext';
import { getHelpCenterUrl } from '@/shared/lib/help-center';
import { useOnboardingStage } from '@/pages/new-chat/api/useOnboardingStage';
import { useNewChatPinnedSkills } from '@/pages/new-chat/api/useNewChatPinnedSkills';
import { useNewChatUpdates } from '@/pages/new-chat/api/useNewChatUpdates';
import { useNewChatSelection } from '@/pages/new-chat/model/useNewChatSelection';

const PIN_HELP_PATH =
  'skills/name-and-description/#f%C3%A4higkeiten-anheften--manuelle-aktivierung';

interface NewChatConfigOptions {
  readonly sessionKey: string;
  readonly initialWorkspaceId?: string;
  /** Opens the workspace creation; the page selects what it created. */
  readonly onCreateWorkspace: () => void;
}

function useNewChatWorkspaces(
  selection: ReturnType<typeof useNewChatSelection>,
  onCreate: () => void,
): ChatWorkspaces {
  const { workspaces } = useWorkspaces();
  const { mutate: assignToWorkspace } = useAssignThreadToWorkspace();
  return {
    items: workspaces,
    selected: selection.workspaceId,
    select: selection.selectWorkspace,
    moveThread: (threadId, workspaceId) =>
      assignToWorkspace({ threadId, workspaceId }),
    create: onCreate,
  };
}

function useNewChatResources() {
  const knowledgeBases = useChatResourceSelection<KnowledgeBaseSummary>();
  const integrations = useChatResourceSelection<IntegrationSummary>();
  return {
    knowledgeBases: useWebKnowledgeBases(knowledgeBases),
    integrations: useWebIntegrations(integrations),
  };
}

/** Everything the Web new chat shows, as data for the package `NewChat`. */
export function useNewChatConfig({
  sessionKey,
  initialWorkspaceId,
  onCreateWorkspace,
}: NewChatConfigOptions) {
  const selection = useNewChatSelection(initialWorkspaceId);
  const pinned = useNewChatPinnedSkills(selection.workspaceId);
  const stage = useOnboardingStage(true);
  const onThreadStarted = useWebChatStarted();
  const config: ChatViewConfig = {
    sessionKey,
    transport: threadRunEndpoints,
    layout: 'page',
    ...useNewChatResources(),
    workspaces: useNewChatWorkspaces(selection, onCreateWorkspace),
    skills: {
      selected: selection.skill,
      clear: selection.clearSkill,
      pinned: {
        ...pinned,
        helpUrl: getHelpCenterUrl(PIN_HELP_PATH),
        select: selection.toggleSkill,
      },
    },
    productUpdates: useNewChatUpdates(),
    onboarding: {
      hint: stage?.stage
        ? { stage: stage.stage, modelId: stage.modelId }
        : null,
    },
    tourTargets: WEB_CHAT_TOUR_TARGETS,
    events: { ...useWebChatEvents(), onThreadStarted },
  };
  return { config, selectWorkspace: selection.selectWorkspace };
}
