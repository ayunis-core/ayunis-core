import type {
  GetThreadResponseDto,
  MeResponseDtoRole,
  MeResponseDtoSystemRole,
  ModelMode,
  ToggleFavoriteDtoReferenceType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { OpenPanel } from '@openpanel/web';
import { openPanel } from './openpanel';

/**
 * Tracking plan v1 (AYC-1723). Properties are enums, booleans or known
 * catalogue IDs only: never content, titles, filenames, URLs, free text,
 * names, emails or entity IDs.
 */
export type OpenPanelGlobalProperties = {
  role: MeResponseDtoRole;
  system_role: MeResponseDtoSystemRole;
  /** `completed`: every step visible to the user's role is checked. */
  onboarding_stage: 'not_started' | 'started' | 'completed' | 'dismissed';
};

/** Fields of a thread that isn't loaded are omitted, never reported as false. */
export type InteractionContext = {
  workspace_context?: boolean;
  anonymous_mode?: boolean;
  has_knowledge_base?: boolean;
  has_source?: boolean;
  has_integration?: boolean;
  mode?: ModelMode | 'model';
};

type ThreadTurn = 'first' | 'follow_up';

/** Flags from the run's tool calls that did not end in an error. */
type RunToolUsage = {
  used_knowledge_base: boolean;
  used_source: boolean;
  used_internet_search: boolean;
  used_skill: boolean;
  used_integration: boolean;
  created_artifact: boolean;
};

type ProductiveOutcome =
  | { outcome_type: 'answer_copied'; output_type: 'answer' }
  | { outcome_type: 'code_copied'; output_type: 'code' }
  | {
      outcome_type: 'artifact_exported';
      output_type: 'document';
      format: 'docx' | 'pdf';
    }
  | {
      outcome_type: 'artifact_exported';
      output_type: 'spreadsheet';
      format: 'xlsx' | 'csv';
    }
  | {
      outcome_type: 'artifact_edited';
      output_type: 'document' | 'spreadsheet';
    }
  | {
      outcome_type: 'visual_downloaded';
      output_type: 'diagram' | 'chart' | 'image';
      format: 'png' | 'svg';
    }
  | {
      outcome_type: 'email_handed_off';
      output_type: 'email';
      format: 'mailto' | 'clipboard';
    }
  | {
      outcome_type: 'calendar_event_downloaded';
      output_type: 'calendar_event';
      format: 'ics';
    };

/** `undefined` marks an event without properties. */
type OpenPanelEvents = {
  chat_started: InteractionContext & { has_skill: boolean };
  run_started: InteractionContext & {
    thread_turn: ThreadTurn;
    voice_input: boolean;
  };
  ai_output_delivered: InteractionContext & {
    thread_turn: ThreadTurn;
  } & RunToolUsage;
  productive_outcome: InteractionContext & ProductiveOutcome;
  workspace_created: undefined;
  knowledge_base_created: { workspace_context: boolean };
  skill_installed: { marketplace_slug: string };
  skill_created: undefined;
  integration_installed: { marketplace_slug: string };
  /** `null` for custom integrations, whose name must never be sent. */
  integration_connected: { marketplace_slug: string | null };
  favorite_added: { resource_type: ToggleFavoriteDtoReferenceType };
  favorite_opened: { resource_type: ToggleFavoriteDtoReferenceType };
  welcome_video_seen: undefined;
  personalization_saved: { state: 'completed' | 'skipped' };
  /** `step_id` is a step `id` from `widgets/onboarding/config`. */
  onboarding_step_toggled: { step_id: string; checked: boolean };
  onboarding_hidden_changed: { hidden: boolean };
};

type OpenPanelEventName = keyof OpenPanelEvents;

type OpenPanelEventArgs<Name extends OpenPanelEventName> =
  OpenPanelEvents[Name] extends undefined
    ? []
    : [properties: OpenPanelEvents[Name]];

/**
 * Fire-and-forget: a missing client, a throwing SDK call or a rejected send
 * never reaches the caller, so tracking cannot break the tracked action.
 */
export function trackOpenPanelEvent<Name extends OpenPanelEventName>(
  name: Name,
  ...[properties]: OpenPanelEventArgs<Name>
): void {
  if (!openPanel) return;
  sendOpenPanelEvent(openPanel, name, properties).catch(() => undefined);
}

async function sendOpenPanelEvent(
  client: OpenPanel,
  name: OpenPanelEventName,
  properties: OpenPanelEvents[OpenPanelEventName],
): Promise<void> {
  await client.track(name, properties);
}

type InteractionContextThread = Pick<
  GetThreadResponseDto,
  'workspaceId' | 'isAnonymous' | 'mode'
> &
  Record<'knowledgeBases' | 'sources' | 'mcpIntegrations', readonly unknown[]>;

export function threadInteractionContext(
  thread: InteractionContextThread | undefined,
): InteractionContext {
  if (!thread) return {};
  return {
    workspace_context: thread.workspaceId !== null,
    anonymous_mode: thread.isAnonymous,
    has_knowledge_base: thread.knowledgeBases.length > 0,
    has_source: thread.sources.length > 0,
    has_integration: thread.mcpIntegrations.length > 0,
    mode: thread.mode ?? 'model',
  };
}
