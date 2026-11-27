import type {
  CreateThreadDto,
  GetThreadResponseDto,
  NotificationType,
  OnboardingStage,
  RunErrorResponseDto,
} from '@ayunis/api-client/schemas';
import type { ChatDraftStorage } from '@ayunis/chat/composer';
import type { ChatWorkspace } from './workspaces/chat-workspace';
import type { ToolCards } from './timeline/tool-card-types';
import type { ClientToolDispatch } from './client-tool-dispatch';
import type { RunEndpoints } from './run-endpoints';
import type { RunExecutionRequest, RunOutcome } from './run-execution';
import type { RunRequestObserver } from './run-lifecycle';

export type ChatLayout = 'page' | 'narrow';

export type ChatTourTarget =
  | 'composer'
  | 'upload'
  | 'voice'
  | 'send'
  | 'model'
  | 'anonymous'
  | 'workspace'
  | 'pinnedSkills';

/** A place outside the chat; the host resolves it in `events.onNavigate`. */
export type ChatNavigationTarget =
  | { readonly kind: 'academy' }
  | { readonly kind: 'releaseNote'; readonly releaseNoteId: string }
  | { readonly kind: 'notification'; readonly notificationId: string }
  | { readonly kind: 'recording'; readonly recordingId: string }
  /** The inbox, filtered to one notification type. */
  | { readonly kind: 'inbox'; readonly type: NotificationType }
  | { readonly kind: 'releaseNotes' }
  /** A host location of the host's own trail. */
  | { readonly kind: 'path'; readonly path: string };

export interface ChatTrailItem {
  readonly label: string;
  readonly target: ChatNavigationTarget;
}

export type ChatTrailThread = Pick<GetThreadResponseDto, 'id' | 'workspaceId'>;

/** The live state of the open chat, including what a running answer added. */
export type ChatThreadState = Pick<
  GetThreadResponseDto,
  'id' | 'title' | 'messages' | 'piiMasks'
>;

export type ChatMenuStatus = 'loading' | 'error' | 'ready';

export interface ChatSelectedSkill {
  readonly id: string;
  readonly name: string;
}

export interface ChatPinnedSkill extends ChatSelectedSkill {
  /** Absent for a personal or shared skill. */
  readonly workspaceId?: string;
}

export interface ChatPinnedSkills {
  readonly items: readonly ChatPinnedSkill[];
  /** Whether the selected workspace's pins have loaded. */
  readonly status: ChatMenuStatus;
  /** Where pinning skills is explained. */
  readonly helpUrl: string;
  readonly select: (skill: ChatPinnedSkill) => void;
}

export interface ChatSkills {
  readonly selected?: ChatSelectedSkill;
  readonly clear: () => void;
  /** The new chat's quick picks. */
  readonly pinned?: ChatPinnedSkills;
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

export interface ChatWorkspaces {
  readonly items: readonly ChatWorkspace[];
  /** The workspace a new chat is filed under; `null` for none. */
  readonly selected: string | null;
  readonly select: (workspaceId: string | null) => void;
  /** `null` removes the chat from its workspace. */
  readonly moveThread: (threadId: string, workspaceId: string | null) => void;
  /**
   * Opens the host's workspace creation. It files the chat there, or, without
   * a chat, selects the created workspace for the new chat.
   */
  readonly create: (threadId?: string) => void;
}

export interface ChatFavorites {
  readonly isFavorite: (threadId: string) => boolean;
  readonly toggle: (threadId: string) => void;
}

export interface ChatArtifactPanel {
  readonly open: boolean;
  readonly toggle: () => void;
}

export interface ChatContextSummary {
  /** Absent for a chat outside a workspace. */
  readonly workspaceName?: string;
  readonly skills: number;
  readonly knowledgeBases: number;
}

export interface ChatContextHint {
  /** `null` while the context is unknown; nothing is shown then. */
  readonly summary: ChatContextSummary | null;
  readonly open: () => void;
}

export interface ChatNewChat {
  readonly start: () => void;
}

export interface ChatUnreadNotifications {
  readonly type: NotificationType;
  readonly count: number;
}

/** What is new for the user, shown under the new chat's composer. */
export interface ChatProductUpdates {
  /** A type without unread notifications shows no tab. */
  readonly notifications: readonly ChatUnreadNotifications[];
  /** Unread product updates; without it there is no product-updates tab. */
  readonly releaseNotes?: number;
}

export interface ChatOnboardingHint {
  readonly stage: OnboardingStage;
  /** The model a profile chat runs on; without it the stage offers no chat. */
  readonly modelId: string | null;
}

export interface ChatOnboarding {
  /** `null` while the user has no stage to complete. */
  readonly hint: ChatOnboardingHint | null;
}

export type ChatStartOrigin = NonNullable<CreateThreadDto['origin']>;

/** A chat the new chat started; its first message is on its way. */
export interface ChatStarted {
  readonly thread: GetThreadResponseDto;
  readonly origin?: ChatStartOrigin;
  readonly skillId?: string;
  readonly sources: readonly { readonly name: string }[];
  readonly knowledgeBases: readonly ChatResourceSummary[];
  readonly integrations: readonly ChatResourceSummary[];
  /**
   * Resolves once the new chat's settle animation has played: `true` while
   * the start still stands, `false` once it was stopped.
   */
  readonly settled: Promise<boolean>;
}

export interface ChatEvents {
  readonly onNewChat: () => void;
  /** A new chat was created and its first message handed off; the host opens it. */
  readonly onThreadStarted?: (started: ChatStarted) => void;
  /** Without it, links that leave the chat (academy, origin, recordings) are not shown. */
  readonly onNavigate?: (target: ChatNavigationTarget) => void;
  /** The address of a target, so its link can also open in a new tab. */
  readonly hrefFor?: (target: ChatNavigationTarget) => string;
  readonly onOpenArtifact?: (artifactId: string) => void;
  readonly onThreadState?: (thread: ChatThreadState) => void;
  readonly onThreadDeleted?: (threadId: string) => void;
  readonly onRunError?: (error: RunErrorResponseDto) => void;
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
  readonly workspaces?: ChatWorkspaces;
  readonly favorites?: ChatFavorites;
  readonly artifactPanel?: ChatArtifactPanel;
  readonly contextHint?: ChatContextHint;
  readonly productUpdates?: ChatProductUpdates;
  readonly onboarding?: ChatOnboarding;
  /** The conversation header's breadcrumbs before the chat's title. */
  readonly trail?: (thread: ChatTrailThread) => readonly ChatTrailItem[];
  /** Offers starting a new chat from the conversation header. */
  readonly newChat?: ChatNewChat;
  readonly toolCards?: ToolCards;
  readonly clientTools?: ClientToolDispatch<Context, Outcome>;
  readonly events: ChatEvents;
  readonly tourTargets?: Partial<Record<ChatTourTarget, string>>;
}

/** What the chat's views read; the client tools belong to the run. */
export type ChatViewConfig = Omit<ChatConfig, 'clientTools'>;
