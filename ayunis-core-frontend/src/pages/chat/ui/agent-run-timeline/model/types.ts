import type {
  Message,
  ToolUseMessageContent,
  TextMessageContent,
} from '@/pages/chat/model/openapi';
import type { ToolCallDecision } from '@/shared/api';

export type StepStatus = 'in_progress' | 'done' | 'error';

export type TimelineStep =
  | {
      kind: 'thinking';
      key: string;
      transcript: string;
      status: StepStatus;
    }
  | {
      kind: 'tool';
      key: string;
      toolUse: ToolUseMessageContent;
      result?: string;
      /** How the user decided a call that required confirmation. */
      decision?: ToolCallDecision;
      status: StepStatus;
    }
  | {
      kind: 'skill_instruction';
      key: string;
      text: string;
      status: StepStatus;
    };

export type ToolTimelineStep = Extract<TimelineStep, { kind: 'tool' }>;

export interface ActivityRunBlock {
  kind: 'activity';
  key: string;
  steps: TimelineStep[];
}

export interface RichToolRunBlock {
  kind: 'rich-tool';
  key: string;
  /**
   * Non-empty. Holds one step per tool call; consecutive mutations of the
   * same artifact are merged here so only the last step's widget is rendered.
   */
  steps: ToolTimelineStep[];
}

export interface PendingToolRunBlock {
  kind: 'pending-tool';
  key: string;
  step: ToolTimelineStep;
}

export type InlineToolRunBlock = RichToolRunBlock | PendingToolRunBlock;

/** The `finish_routine` call that ends a routine run. */
export interface RoutineFinishedRunBlock {
  kind: 'routine-finished';
  key: string;
}

export interface TextRunBlock {
  kind: 'text';
  key: string;
  content: TextMessageContent;
}

export type AgentRunBlock =
  | ActivityRunBlock
  | InlineToolRunBlock
  | RoutineFinishedRunBlock
  | TextRunBlock;

export interface AgentRunUnit {
  kind: 'agent-run';
  key: string;
  blocks: AgentRunBlock[];
  isStreaming: boolean;
}

export interface UserUnit {
  kind: 'user';
  key: string;
  message: Message;
}

export type RenderUnit = UserUnit | AgentRunUnit;
