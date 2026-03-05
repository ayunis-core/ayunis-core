import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ResolveShareScopeUserIdsUseCase } from 'src/domain/shares/application/use-cases/resolve-share-scope-user-ids/resolve-share-scope-user-ids.use-case';
import { ResolveShareScopeUserIdsQuery } from 'src/domain/shares/application/use-cases/resolve-share-scope-user-ids/resolve-share-scope-user-ids.query';
import { SkillRepository } from '../ports/skill.repository';

@Injectable()
export class ShareDeletedListener {
  private readonly logger = new Logger(ShareDeletedListener.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly resolveShareScopeUserIds: ResolveShareScopeUserIdsUseCase,
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

    const retainUserIds = await this.resolveShareScopeUserIds.execute(
      new ResolveShareScopeUserIdsQuery(event.remainingScopes),
    );

    await this.skillRepository.deactivateUsersNotInSet(
      event.entityId,
      event.ownerId,
      retainUserIds,
    );
  }
}
