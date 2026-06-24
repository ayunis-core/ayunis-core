import type { UUID } from 'crypto';

export class RecordThreadActivityCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly occurredAt: Date,
  ) {}
}
