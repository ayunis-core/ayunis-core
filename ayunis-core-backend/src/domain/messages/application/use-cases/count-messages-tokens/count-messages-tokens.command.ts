import type { Message } from 'src/domain/messages/domain/message.entity';

export class CountMessagesTokensCommand {
  constructor(public readonly messages: Message[]) {}
}
