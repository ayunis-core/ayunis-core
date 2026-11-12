import type { UUID } from 'crypto';
import type { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type {
  CollectiveOwner,
  CollectiveOwnerAccess,
  CollectiveOwnerPermissions,
  ReadableCollectiveOwners,
} from 'src/iam/teams/application/models/collective-owner.model';
import { GetCollectiveOwnerAccessQuery } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.query';
import type { GetCollectiveOwnerAccessUseCase } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.use-case';
import type { ListReadableCollectiveOwnersUseCase } from 'src/iam/teams/application/use-cases/list-readable-collective-owners/list-readable-collective-owners.use-case';

export interface CollectiveResourcePolicy {
  permissions: CollectiveOwnerPermissions;
  notFound: (id: UUID) => ApplicationError;
}

/**
 * Enforces `GetCollectiveOwnerAccessUseCase` for one kind of team- or
 * org-owned resource: unreadable resources are hidden behind the resource's
 * not-found error, readable but unmanageable ones are forbidden.
 */
export abstract class CollectiveResourceAccessService<
  TResource extends { id: UUID },
> {
  protected constructor(
    private readonly getOwnerAccess: GetCollectiveOwnerAccessUseCase,
    private readonly listReadableOwners: ListReadableCollectiveOwnersUseCase,
    private readonly policy: CollectiveResourcePolicy,
  ) {}

  protected abstract ownerOf(resource: TResource): CollectiveOwner;

  async requireRead(resource: TResource): Promise<void> {
    const access = await this.accessTo(resource, { manage: false });
    if (!access.canRead) throw this.policy.notFound(resource.id);
  }

  async requireWrite(resource: TResource): Promise<void> {
    const access = await this.accessTo(resource);
    if (!access.canRead) throw this.policy.notFound(resource.id);
    if (!access.canManage) throw new UnauthorizedAccessError();
  }

  /** For resources that do not exist yet, where hiding them makes no sense. */
  async requireManage(resource: TResource): Promise<void> {
    const access = await this.accessTo(resource);
    if (!access.canManage) throw new UnauthorizedAccessError();
  }

  readableOwners(): Promise<ReadableCollectiveOwners> {
    return this.listReadableOwners.execute();
  }

  private accessTo(
    resource: TResource,
    { manage } = { manage: true },
  ): Promise<CollectiveOwnerAccess> {
    return this.getOwnerAccess.execute(
      new GetCollectiveOwnerAccessQuery(
        this.ownerOf(resource),
        manage ? this.policy.permissions : undefined,
      ),
    );
  }
}
