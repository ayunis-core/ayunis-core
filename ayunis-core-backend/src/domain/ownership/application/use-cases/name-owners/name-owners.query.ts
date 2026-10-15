import type { UUID } from 'crypto';
import type { LookupOwner } from 'src/domain/ownership/application/models/ownership-lookup';

export class NameOwnersQuery {
  constructor(
    public readonly owners: LookupOwner[],
    public readonly userIds: (UUID | null)[] = [],
  ) {}
}
