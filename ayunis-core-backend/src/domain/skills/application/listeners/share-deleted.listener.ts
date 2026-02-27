import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeResolverService } from 'src/domain/shares/application/services/share-scope-resolver.service';
import { SkillRepository } from '../ports/skill.repository';

@Injectable()
export class ShareDeletedListener {
  private readonly logger = new Logger(ShareDeletedListener.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly shareScopeResolver: ShareScopeResolverService,
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

    const retainUserIds = await this.shareScopeResolver.resolveUserIds(
      event.remainingScopes,
    );

    await this.skillRepository.deactivateUsersNotInSet(
      event.entityId,
      event.ownerId,
      retainUserIds,
    );
  }
}
