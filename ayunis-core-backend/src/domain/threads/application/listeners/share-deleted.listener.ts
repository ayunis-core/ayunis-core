import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeResolverService } from 'src/domain/shares/application/services/share-scope-resolver.service';
import { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { FindAllUserIdsByOrgIdQuery } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.query';
import { RemoveSkillSourcesFromThreadsUseCase } from '../use-cases/remove-skill-sources-from-threads/remove-skill-sources-from-threads.use-case';
import { RemoveSkillSourcesFromThreadsCommand } from '../use-cases/remove-skill-sources-from-threads/remove-skill-sources-from-threads.command';
import { RemoveKbAssignmentsByOriginSkillUseCase } from '../use-cases/remove-kb-assignments-by-origin-skill/remove-kb-assignments-by-origin-skill.use-case';
import { RemoveKbAssignmentsByOriginSkillCommand } from '../use-cases/remove-kb-assignments-by-origin-skill/remove-kb-assignments-by-origin-skill.command';

@Injectable()
export class ShareDeletedListener {
  private readonly logger = new Logger(ShareDeletedListener.name);

  constructor(
    private readonly removeSkillSourcesFromThreads: RemoveSkillSourcesFromThreadsUseCase,
    private readonly removeKbAssignmentsByOriginSkill: RemoveKbAssignmentsByOriginSkillUseCase,
    private readonly findAllUserIdsByOrgId: FindAllUserIdsByOrgIdUseCase,
    private readonly shareScopeResolver: ShareScopeResolverService,
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

    const retainUserIds = await this.shareScopeResolver.resolveUserIds(
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

    await this.removeKbAssignmentsByOriginSkill.execute(
      new RemoveKbAssignmentsByOriginSkillCommand(
        event.entityId,
        lostAccessUserIds,
      ),
    );
  }
}
