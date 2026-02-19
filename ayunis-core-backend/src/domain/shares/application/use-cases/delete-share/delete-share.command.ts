import type { UUID } from 'crypto';

export class DeleteShareCommand {
  constructor(readonly shareId: UUID) {}
}
