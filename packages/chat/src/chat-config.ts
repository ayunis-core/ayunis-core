import type { ChatDraftStorage } from '@ayunis/chat/composer';
import type { ToolCards } from './timeline/tool-card-types';
import type { ClientToolDispatch } from './client-tool-dispatch';
import type { RunEndpoints } from './run-endpoints';
import type { RunExecutionRequest, RunOutcome } from './run-execution';
import type { RunRequestObserver } from './run-lifecycle';

export type ChatLayout = 'page' | 'narrow';

export type ChatTourTarget =
  'composer' | 'upload' | 'voice' | 'send' | 'model' | 'anonymous';

export type ChatNavigationTarget = { readonly kind: 'academy' };

export type ChatMenuStatus = 'loading' | 'error' | 'ready';

export interface ChatSelectedSkill {
  readonly id: string;
  readonly name: string;
}

export interface ChatSkills {
  readonly selected?: ChatSelectedSkill;
  readonly clear: () => void;
}

export interface ChatResourceSummary {
  readonly id: string;
  readonly name: string;
}

export interface ChatKnowledgeBaseItem extends ChatResourceSummary {
  readonly isShared?: boolean;
}

export interface ChatIntegrationSummary extends ChatResourceSummary {
  readonly logoUrl?: string | null;
}

export interface ChatIntegrationItem extends ChatIntegrationSummary {
  readonly userAuthorized?: boolean;
}

export interface ChatKnowledgeBases {
  readonly items: readonly ChatKnowledgeBaseItem[];
  readonly status: ChatMenuStatus;
  readonly attached: readonly ChatResourceSummary[];
  readonly attach: (knowledgeBase: ChatResourceSummary) => void;
  readonly detach: (knowledgeBaseId: string) => void;
  readonly create: () => void;
}

export interface ChatIntegrations {
  readonly items: readonly ChatIntegrationItem[];
  readonly status: ChatMenuStatus;
  readonly attached: readonly ChatIntegrationSummary[];
  readonly attach: (integration: ChatIntegrationSummary) => void;
  readonly detach: (integrationId: string) => void;
}

export interface ChatEvents {
  readonly onNewChat: () => void;
  /** Without it, links that leave the chat (such as the academy) are not shown. */
  readonly onNavigate?: (target: ChatNavigationTarget) => void;
  readonly onRunSettled?: (threadId: string, outcome: RunOutcome) => void;
  readonly observeRun?: (
    request: RunExecutionRequest,
    voiceInput: boolean,
    onError?: (error: Error) => void,
  ) => RunRequestObserver | undefined;
  readonly onMessageCopied?: (role: 'user' | 'assistant') => void;
  readonly onCodeCopied?: () => void;
  readonly onUnauthorized?: () => void;
  readonly onError?: (error: unknown) => void;
}

/**
 * How a surface configures the chat. Shared data (models, modes, chat-start
 * defaults, uploads, transcription) is fetched by the package through the
 * host's configured `@ayunis/api-client` transport. Optional data such as
 * `knowledgeBases` switches its feature on by being present.
 */
export interface ChatConfig<Context = unknown, Outcome = unknown> {
  /** Change this when the authenticated principal changes. Scope supplied data and storage to the same principal. */
  readonly sessionKey: string;
  readonly transport: RunEndpoints;
  readonly layout: ChatLayout;
  readonly drafts?: ChatDraftStorage;
  readonly skills?: ChatSkills;
  readonly knowledgeBases?: ChatKnowledgeBases;
  readonly integrations?: ChatIntegrations;
  readonly toolCards?: ToolCards;
  readonly clientTools?: ClientToolDispatch<Context, Outcome>;
  readonly events: ChatEvents;
  readonly tourTargets?: Partial<Record<ChatTourTarget, string>>;
}
