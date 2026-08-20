import type { UUID } from 'crypto';

export class FindWorkspacesByIdsQuery {
  constructor(public readonly ids: UUID[]) {}
}
