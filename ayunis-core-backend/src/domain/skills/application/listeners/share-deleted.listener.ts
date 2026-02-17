import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UUID } from 'crypto';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { FindAllUserIdsByOrgIdQuery } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.query';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
import { FindAllUserIdsByTeamIdQuery } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.query';
import { RemainingShareScope } from 'src/domain/shares/application/events/share-deleted.event';
import { SkillRepository } from '../ports/skill.repository';

@Injectable()
export class ShareDeletedListener {
  private readonly logger = new Logger(ShareDeletedListener.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly findAllUserIdsByOrgId: FindAllUserIdsByOrgIdUseCase,
    private readonly findAllUserIdsByTeamId: FindAllUserIdsByTeamIdUseCase,
  ) {}

  @OnEvent(ShareDeletedEvent.EVENT_NAME)
  async handleShareDeleted(event: ShareDeletedEvent): Promise<void> {
    if (event.entityType !== SharedEntityType.SKILL) {
      return;
    }

    this.logger.log('Cleaning up skill activations after share deletion', {
      skillId: event.entityId,
      ownerId: event.ownerId,
      remainingScopeCount: event.remainingScopes.length,
    });

    if (event.remainingScopes.length === 0) {
      await this.skillRepository.deactivateAllExceptOwner(
        event.entityId,
        event.ownerId,
      );
      return;
    }

    const retainUserIds = await this.resolveUserIds(event.remainingScopes);

    await this.skillRepository.deactivateUsersNotInSet(
      event.entityId,
      event.ownerId,
      retainUserIds,
    );
  }

  private async resolveUserIds(
    scopes: RemainingShareScope[],
  ): Promise<Set<UUID>> {
    const userIds = new Set<UUID>();

    for (const scope of scopes) {
      const ids = await this.resolveScopeUserIds(scope);
      for (const id of ids) {
        userIds.add(id);
      }
    }

    return userIds;
  }

  private async resolveScopeUserIds(
    scope: RemainingShareScope,
  ): Promise<UUID[]> {
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
