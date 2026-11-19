import type { UUID } from 'crypto';

export class PauseSourceProcessingCommand {
  constructor(public readonly sourceId: UUID) {}
}
