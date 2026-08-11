import type { UUID } from 'crypto';

export class FindWorkspaceQuery {
  constructor(public readonly id: UUID) {}
}
