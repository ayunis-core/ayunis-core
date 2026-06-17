import type { UUID } from 'crypto';

export class RunExecutedEvent {
  static readonly EVENT_NAME = 'run.executed';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
