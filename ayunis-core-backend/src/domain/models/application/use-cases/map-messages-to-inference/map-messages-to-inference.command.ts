import type { UUID } from 'crypto';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';

export class MapMessagesToInferenceCommand {
  constructor(
    public readonly messages: Message[],
    public readonly orgId: UUID,
    public readonly tools: readonly ToolSchema[] = [],
  ) {}
}
