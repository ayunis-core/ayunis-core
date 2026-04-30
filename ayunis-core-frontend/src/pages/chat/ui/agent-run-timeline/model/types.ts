import type {
  Message,
  ToolUseMessageContent,
  TextMessageContent,
} from '@/pages/chat/model/openapi';

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
      status: StepStatus;
    }
  | {
      kind: 'interim_text';
      key: string;
      text: string;
      status: StepStatus;
    }
  | {
      kind: 'skill_instruction';
      key: string;
      text: string;
      status: StepStatus;
    };

export interface RichCard {
  key: string;
  toolUse: ToolUseMessageContent;
  result?: string;
}

export interface AgentRunUnit {
  kind: 'agent-run';
  key: string;
  steps: TimelineStep[];
  richCards: RichCard[];
  finalText: TextMessageContent[];
  isStreaming: boolean;
}

export interface UserUnit {
  kind: 'user';
  key: string;
  message: Message;
}

export type RenderUnit = UserUnit | AgentRunUnit;
