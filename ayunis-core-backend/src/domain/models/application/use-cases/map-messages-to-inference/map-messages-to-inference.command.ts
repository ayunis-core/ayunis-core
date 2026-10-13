import type { ProviderImageLimits } from '@ayunis/inference';
import type { UUID } from 'crypto';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';

export class MapMessagesToInferenceCommand {
  constructor(
    public readonly messages: Message[],
    public readonly orgId: UUID,
    public readonly tools: readonly ToolSchema[] = [],
    /** The provider's image limits; the strictest known apply without them. */
    public readonly imageLimits?: ProviderImageLimits,
  ) {}
}
