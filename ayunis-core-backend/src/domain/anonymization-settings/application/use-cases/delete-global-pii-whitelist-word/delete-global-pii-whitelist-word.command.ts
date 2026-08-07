import type { UUID } from 'crypto';

export class DeleteGlobalPiiWhitelistWordCommand {
  constructor(public readonly wordId: UUID) {}
}
