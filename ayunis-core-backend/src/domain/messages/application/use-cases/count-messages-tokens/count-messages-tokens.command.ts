import { TokenCounterType } from 'src/common/token-counter/application/ports/token-counter.handler.port';
import { Message } from '../../../domain/message.entity';

export class CountMessagesTokensCommand {
  constructor(
    public readonly messages: Message[],
    public readonly counterType?: TokenCounterType,
  ) {}
}
