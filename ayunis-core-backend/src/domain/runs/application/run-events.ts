import type { Message } from 'src/domain/messages/domain/message.entity';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export interface RunSessionEvent {
  type: 'session';
  streaming: boolean;
  threadId: string;
  timestamp: string;
}

export interface RunMessageEvent {
  type: 'message';
  message: Message;
  threadId: string;
  timestamp: string;
}

export interface RunErrorEvent {
  type: 'error';
  message: string;
  threadId: string;
  timestamp: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface RunThreadEvent {
  type: 'thread';
  threadId: string;
  updateType: 'title_updated';
  title: string;
  timestamp: string;
}

export interface RunMaskPayload {
  token: string;
  value: string;
  category: PiiCategory;
}

export interface RunMasksEvent {
  type: 'masks';
  threadId: string;
  /** Full mask dictionary of the thread (idempotent to re-apply). */
  masks: RunMaskPayload[];
  timestamp: string;
}

export type RunEvent =
  | RunSessionEvent
  | RunMessageEvent
  | RunErrorEvent
  | RunThreadEvent
  | RunMasksEvent;
