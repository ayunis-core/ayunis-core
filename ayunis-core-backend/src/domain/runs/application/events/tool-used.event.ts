import type { UUID } from 'crypto';

export class ToolUsedEvent {
  static readonly EVENT_NAME = 'run.tool-used';

  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly toolName: string,
  ) {}
}
