import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { DeleteUnreferencedSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-unreferenced-sources/delete-unreferenced-sources.use-case';
import { DeleteUnreferencedSourcesCommand } from 'src/domain/sources/application/use-cases/delete-unreferenced-sources/delete-unreferenced-sources.command';

/**
 * The `skills.userId` FK cascade removes a deleted user's skills and their
 * `skill_sources` links, but the sources themselves have no owner FK and would
 * keep their indexes and retained originals until the org is deleted. Their
 * ids are resolved before the row delete and released after it succeeds.
 * Failures are logged, never thrown, so a lookup error cannot block deletion.
 */
@Injectable()
export class SkillsUserDeletionRequestedListener {
  private readonly logger = new Logger(
    SkillsUserDeletionRequestedListener.name,
  );

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly deleteUnreferencedSourcesUseCase: DeleteUnreferencedSourcesUseCase,
  ) {}

  @OnEvent(UserDeletionRequestedEvent.EVENT_NAME)
  async handleUserDeletionRequested(
    event: UserDeletionRequestedEvent,
  ): Promise<void> {
    try {
      const sourceIds = await this.skillRepository.findSourceIdsByOwnerUserId(
        event.userId,
      );
      if (sourceIds.length === 0) return;

      this.logger.log(
        { userId: event.userId, sourceCount: sourceIds.length },
        'Deferring skill source cleanup for deleted user',
      );
      event.deferCleanup('delete skill sources', async () => {
        await this.deleteUnreferencedSourcesUseCase.execute(
          new DeleteUnreferencedSourcesCommand(sourceIds, event.orgId),
        );
      });
    } catch (error) {
      this.logger.error(
        { userId: event.userId, err: error as Error },
        'Failed to resolve skill sources for deleted user',
      );
    }
  }
}
