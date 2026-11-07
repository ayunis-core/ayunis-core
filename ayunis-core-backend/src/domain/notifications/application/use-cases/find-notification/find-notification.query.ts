import type { UUID } from 'crypto';

export class FindNotificationQuery {
  constructor(public readonly id: UUID) {}
}
