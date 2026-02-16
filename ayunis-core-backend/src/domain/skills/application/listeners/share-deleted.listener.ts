import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharesRepository } from 'src/domain/shares/application/ports/shares-repository.port';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { SkillRepository } from '../ports/skill.repository';

@Injectable()
export class ShareDeletedListener {
  private readonly logger = new Logger(ShareDeletedListener.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    @Inject(SharesRepository)
    private readonly sharesRepository: SharesRepository,
  ) {}

  @OnEvent(ShareDeletedEvent.EVENT_NAME)
  async handleShareDeleted(event: ShareDeletedEvent): Promise<void> {
    if (event.entityType !== SharedEntityType.SKILL) {
      return;
    }

    // Check if there are any remaining shares for this skill
    const remainingShares = await this.sharesRepository.findByEntityIdAndType(
      event.entityId,
      SharedEntityType.SKILL,
    );

    // Only deactivate non-owner activations if no shares remain
    if (remainingShares.length > 0) {
      this.logger.log(
        'Skipping skill activation cleanup - other shares still exist',
        {
          skillId: event.entityId,
          remainingShareCount: remainingShares.length,
        },
      );
      return;
    }

    this.logger.log('Cleaning up skill activations after last share deletion', {
      skillId: event.entityId,
      ownerId: event.ownerId,
    });

    await this.skillRepository.deactivateAllExceptOwner(
      event.entityId,
      event.ownerId,
    );
  }
}
