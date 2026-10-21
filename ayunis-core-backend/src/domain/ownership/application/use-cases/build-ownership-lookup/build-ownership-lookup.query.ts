import type { CollectiveOwner } from 'src/domain/ownership/application/models/collective-owner';
import type { OwnedResourceKind } from 'src/domain/ownership/application/models/owned-resource-kind';
import type { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';

export class BuildOwnershipLookupQuery {
  constructor(
    public readonly kind: OwnedResourceKind,
    public readonly owners: CollectiveOwner[],
    public readonly viewer?: OwnershipViewer,
  ) {}
}
