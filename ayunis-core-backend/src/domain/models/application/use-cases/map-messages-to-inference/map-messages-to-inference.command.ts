import type { UUID } from 'crypto';
import type { Message } from 'src/domain/messages/domain/message.entity';

export class MapMessagesToInferenceCommand {
  constructor(
    public readonly messages: Message[],
    public readonly orgId: UUID,
  ) {}
}
