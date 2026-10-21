import type { UUID } from 'crypto';
import type { OwnedResourceKind } from 'src/domain/ownership/application/models/owned-resource-kind';

export class DescribeCollectiveOwnersQuery {
  constructor(
    public readonly kind: OwnedResourceKind,
    public readonly teamIds: UUID[],
    public readonly includeOrg: boolean,
  ) {}
}
