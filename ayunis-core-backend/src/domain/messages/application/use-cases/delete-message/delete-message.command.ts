import { UUID } from 'crypto';

export class DeleteMessageCommand {
  constructor(public readonly messageId: UUID) {}
}
