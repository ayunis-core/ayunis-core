import type { TokenCounterType } from 'src/common/token-counter/application/ports/token-counter.handler.port';
import type { Message } from '../../../domain/message.entity';

export class TrimMessagesForContextCommand {
  constructor(
    public readonly messages: Message[],
    public readonly maxTokens: number,
    public readonly counterType?: TokenCounterType,
  ) {}
}
