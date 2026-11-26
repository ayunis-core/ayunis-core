import type { UUID } from 'crypto';

export class MarkNotificationUnreadCommand {
  constructor(public readonly id: UUID) {}
}
