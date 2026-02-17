import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UUID } from 'crypto';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharesRepository } from 'src/domain/shares/application/ports/shares-repository.port';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import {
  OrgShareScope,
  TeamShareScope,
} from 'src/domain/shares/domain/share-scope.entity';
import { Share } from 'src/domain/shares/domain/share.entity';
import { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { FindAllUserIdsByOrgIdQuery } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.query';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
import { FindAllUserIdsByTeamIdQuery } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.query';
import { SkillRepository } from '../ports/skill.repository';

interface ResolvedScope {
  scopeType: ShareScopeType;
  scopeId: UUID;
}

@Injectable()
export class ShareDeletedListener {
  private readonly logger = new Logger(ShareDeletedListener.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly sharesRepository: SharesRepository,
    private readonly findAllUserIdsByOrgId: FindAllUserIdsByOrgIdUseCase,
    private readonly findAllUserIdsByTeamId: FindAllUserIdsByTeamIdUseCase,
  ) {}

  @OnEvent(ShareDeletedEvent.EVENT_NAME)
  async handleShareDeleted(event: ShareDeletedEvent): Promise<void> {
    if (event.entityType !== SharedEntityType.SKILL) {
      return;
    }

    // Query current remaining shares from database to ensure we see committed data
    // This avoids stale data issues with concurrent deletions
    const remainingShares = await this.sharesRepository.findByEntityIdAndType(
      event.entityId,
      event.entityType,
    );

    const remainingScopes = remainingShares.map((share) =>
      this.toResolvedScope(share),
    );

    this.logger.log('Cleaning up skill activations after share deletion', {
      skillId: event.entityId,
      ownerId: event.ownerId,
      remainingScopeCount: remainingScopes.length,
    });

    if (remainingScopes.length === 0) {
      await this.skillRepository.deactivateAllExceptOwner(
        event.entityId,
        event.ownerId,
      );
      return;
    }

    const retainUserIds = await this.resolveUserIds(remainingScopes);

    await this.skillRepository.deactivateUsersNotInSet(
      event.entityId,
      event.ownerId,
      retainUserIds,
    );
  }

  private toResolvedScope(share: Share): ResolvedScope {
    const scope = share.scope;
    if (scope instanceof OrgShareScope) {
      return { scopeType: scope.scopeType, scopeId: scope.orgId };
    }
    if (scope instanceof TeamShareScope) {
      return { scopeType: scope.scopeType, scopeId: scope.teamId };
    }
    throw new Error(`Unknown scope type: ${scope.scopeType}`);
  }

  private async resolveUserIds(scopes: ResolvedScope[]): Promise<Set<UUID>> {
    const userIds = new Set<UUID>();

    for (const scope of scopes) {
      const ids = await this.resolveScopeUserIds(scope);
      for (const id of ids) {
        userIds.add(id);
      }
    }

    return userIds;
  }

  private async resolveScopeUserIds(scope: ResolvedScope): Promise<UUID[]> {
    switch (scope.scopeType) {
      case ShareScopeType.ORG:
        return this.findAllUserIdsByOrgId.execute(
          new FindAllUserIdsByOrgIdQuery(scope.scopeId),
        );
      case ShareScopeType.TEAM:
        return this.findAllUserIdsByTeamId.execute(
          new FindAllUserIdsByTeamIdQuery(scope.scopeId),
        );
      default:
        this.logger.warn('Unknown scope type', {
          scopeType: scope.scopeType,
        });
        return [];
    }
  }
}
