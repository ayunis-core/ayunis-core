import type { UUID } from 'crypto';

export class CancelThreadRunCommand {
  constructor(public readonly threadId: UUID) {}
}
