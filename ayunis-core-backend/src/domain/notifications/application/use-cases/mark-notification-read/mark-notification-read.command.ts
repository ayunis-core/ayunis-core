import type { UUID } from 'crypto';

export class MarkNotificationReadCommand {
  constructor(public readonly id: UUID) {}
}
