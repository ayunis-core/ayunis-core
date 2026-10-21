import type { OwnedResourceKind } from 'src/domain/ownership/application/models/owned-resource-kind';

export class ListOwnerOptionsQuery {
  constructor(public readonly kind: OwnedResourceKind) {}
}
