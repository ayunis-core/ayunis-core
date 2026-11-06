import type {
  CollectiveOwner,
  CollectiveOwnerPermissions,
} from 'src/iam/teams/application/models/collective-owner.model';

/** Without `permissions` only read access is resolved. */
export class GetCollectiveOwnerAccessQuery {
  constructor(
    public readonly owner: CollectiveOwner,
    public readonly permissions?: CollectiveOwnerPermissions,
  ) {}
}
