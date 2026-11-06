import { Injectable } from '@nestjs/common';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { CollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type {
  CollectiveOwnerAccess,
  ReadableCollectiveOwners,
} from 'src/iam/teams/application/models/collective-owner.model';
import { GetCollectiveOwnerAccessQuery } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.query';
import { GetCollectiveOwnerAccessUseCase } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.use-case';
import { ListReadableCollectiveOwnersUseCase } from 'src/iam/teams/application/use-cases/list-readable-collective-owners/list-readable-collective-owners.use-case';

const KNOWLEDGE_BASE_OWNER_PERMISSIONS = {
  manage: Permission.MANAGE_KNOWLEDGE_BASES,
  team: Permission.SHARE_KNOWLEDGE_BASES_WITH_TEAMS,
  org: Permission.SHARE_KNOWLEDGE_BASES_WITH_ORG,
};

@Injectable()
export class CollectiveKnowledgeBaseAccessService {
  constructor(
    private readonly getOwnerAccess: GetCollectiveOwnerAccessUseCase,
    private readonly listReadableOwners: ListReadableCollectiveOwnersUseCase,
  ) {}

  async requireRead(knowledgeBase: CollectiveKnowledgeBase): Promise<void> {
    const access = await this.accessTo(knowledgeBase, { manage: false });
    if (!access.canRead) throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
  }

  async requireWrite(knowledgeBase: CollectiveKnowledgeBase): Promise<void> {
    const access = await this.accessTo(knowledgeBase);
    if (!access.canRead) throw new KnowledgeBaseNotFoundError(knowledgeBase.id);
    if (!access.canManage) throw new UnauthorizedAccessError();
  }

  /** For knowledge bases that do not exist yet, where hiding them makes no sense. */
  async requireManage(knowledgeBase: CollectiveKnowledgeBase): Promise<void> {
    const access = await this.accessTo(knowledgeBase);
    if (!access.canManage) throw new UnauthorizedAccessError();
  }

  readableOwners(): Promise<ReadableCollectiveOwners> {
    return this.listReadableOwners.execute();
  }

  private accessTo(
    knowledgeBase: CollectiveKnowledgeBase,
    { manage } = { manage: true },
  ): Promise<CollectiveOwnerAccess> {
    const owner =
      knowledgeBase instanceof TeamKnowledgeBase
        ? { type: 'team' as const, teamId: knowledgeBase.teamId }
        : { type: 'org' as const, orgId: knowledgeBase.orgId };
    return this.getOwnerAccess.execute(
      new GetCollectiveOwnerAccessQuery(
        owner,
        manage ? KNOWLEDGE_BASE_OWNER_PERMISSIONS : undefined,
      ),
    );
  }
}
