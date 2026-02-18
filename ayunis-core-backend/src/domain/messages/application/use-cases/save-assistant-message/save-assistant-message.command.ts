import { AssistantMessage } from '../../../domain/messages/assistant-message.entity';

export class SaveAssistantMessageCommand {
  constructor(public readonly message: AssistantMessage) {}
}
