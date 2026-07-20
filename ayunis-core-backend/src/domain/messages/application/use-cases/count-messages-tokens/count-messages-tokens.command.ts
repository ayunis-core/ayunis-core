import type { TokenCounterType } from 'src/common/token-counter/application/ports/token-counter.handler.port';
import type { Message } from 'src/domain/messages/domain/message.entity';

export class CountMessagesTokensCommand {
  constructor(
    public readonly messages: Message[],
    public readonly counterType?: TokenCounterType,
  ) {}
}
