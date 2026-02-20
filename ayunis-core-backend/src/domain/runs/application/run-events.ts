import type { Message } from 'src/domain/messages/domain/message.entity';

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

export type RunEvent =
  | RunSessionEvent
  | RunMessageEvent
  | RunErrorEvent
  | RunThreadEvent;
