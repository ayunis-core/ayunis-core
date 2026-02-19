import type { MessageContentType } from './value-objects/message-content-type.object';

export abstract class MessageContent {
  constructor(public readonly type: MessageContentType) {}
}
