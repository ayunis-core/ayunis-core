import type { UUID } from 'crypto';

export class UnlinkOparlBodyCommand {
  constructor(readonly bodyId: UUID) {}
}
