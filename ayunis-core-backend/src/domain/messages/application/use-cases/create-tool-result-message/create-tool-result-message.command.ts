import type { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import type { UUID } from 'crypto';

export class CreateToolResultMessageCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly content: Array<ToolResultMessageContent>,
    /**
     * Optional deterministic id so the persisted copy matches the copy the
     * agent runtime already streamed (see the runtime persistence hook).
     */
    public readonly id?: UUID,
  ) {}
}
