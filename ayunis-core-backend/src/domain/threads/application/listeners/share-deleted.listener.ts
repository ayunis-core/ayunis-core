import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UUID } from 'crypto';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { RemainingShareScope } from 'src/domain/shares/application/events/share-deleted.event';
import { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { FindAllUserIdsByOrgIdQuery } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.query';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
import { FindAllUserIdsByTeamIdQuery } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.query';
import { RemoveSkillSourcesFromThreadsUseCase } from '../use-cases/remove-skill-sources-from-threads/remove-skill-sources-from-threads.use-case';
import { RemoveSkillSourcesFromThreadsCommand } from '../use-cases/remove-skill-sources-from-threads/remove-skill-sources-from-threads.command';

@Injectable()
export class ShareDeletedListener {
  private readonly logger = new Logger(ShareDeletedListener.name);

  constructor(
    private readonly removeSkillSourcesFromThreads: RemoveSkillSourcesFromThreadsUseCase,
    private readonly findAllUserIdsByOrgId: FindAllUserIdsByOrgIdUseCase,
    private readonly findAllUserIdsByTeamId: FindAllUserIdsByTeamIdUseCase,
  ) {}

  @OnEvent(ShareDeletedEvent.EVENT_NAME)
  async handleShareDeleted(event: ShareDeletedEvent): Promise<void> {
    if (event.entityType !== SharedEntityType.SKILL) {
      return;
    }

    this.logger.log(
      'Cleaning up thread source assignments after skill share deletion',
      {
        skillId: event.entityId,
        ownerId: event.ownerId,
        remainingScopeCount: event.remainingScopes.length,
      },
    );

    const allOrgUserIds = await this.findAllUserIdsByOrgId.execute(
      new FindAllUserIdsByOrgIdQuery(event.orgId),
    );

    const retainUserIds = await this.resolveRetainedUserIds(
      event.remainingScopes,
    );

    const lostAccessUserIds = allOrgUserIds.filter(
      (id) => id !== event.ownerId && !retainUserIds.has(id),
    );

    await this.removeSkillSourcesFromThreads.execute(
      new RemoveSkillSourcesFromThreadsCommand(
        event.entityId,
        lostAccessUserIds,
      ),
    );
  }

  private async resolveRetainedUserIds(
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
