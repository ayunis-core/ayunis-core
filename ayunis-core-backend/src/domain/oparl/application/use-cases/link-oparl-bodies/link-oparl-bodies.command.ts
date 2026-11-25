import type { UUID } from 'crypto';

export class LinkOparlBodiesCommand {
  constructor(readonly bodyIds: UUID[]) {}
}
