import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';

export class SaveAssistantMessageCommand {
  constructor(public readonly message: AssistantMessage) {}
}
