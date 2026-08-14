import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OnEvent } from '@nestjs/event-emitter';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeResolverService } from 'src/domain/shares/application/services/share-scope-resolver.service';
import { RemoveSkillSourcesFromThreadsUseCase } from '../use-cases/remove-skill-sources-from-threads/remove-skill-sources-from-threads.use-case';
import { RemoveSkillSourcesFromThreadsCommand } from '../use-cases/remove-skill-sources-from-threads/remove-skill-sources-from-threads.command';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase } from '../use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.use-case';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillCommand } from '../use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.command';
import { RemoveDirectKnowledgeBaseFromThreadsUseCase } from '../use-cases/remove-direct-knowledge-base-from-threads/remove-direct-knowledge-base-from-threads.use-case';
import { RemoveDirectKnowledgeBaseFromThreadsCommand } from '../use-cases/remove-direct-knowledge-base-from-threads/remove-direct-knowledge-base-from-threads.command';
@Injectable()
export class ShareDeletedListener {
  constructor(
    @InjectPinoLogger(ShareDeletedListener.name)
    private readonly logger: PinoLogger,
    private readonly removeSkillSourcesFromThreads: RemoveSkillSourcesFromThreadsUseCase,
    private readonly removeKbAssignmentsByOriginSkill: RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase,
    private readonly removeDirectKbFromThreads: RemoveDirectKnowledgeBaseFromThreadsUseCase,
    private readonly shareScopeResolver: ShareScopeResolverService,
  ) {}

  @OnEvent(ShareDeletedEvent.EVENT_NAME)
  async handleShareDeleted(event: ShareDeletedEvent): Promise<void> {
    if (event.entityType === SharedEntityType.SKILL) {
      return this.handleSkillShareDeleted(event);
    }

    if (event.entityType === SharedEntityType.KNOWLEDGE_BASE) {
      return this.handleKnowledgeBaseShareDeleted(event);
    }
  }

  private async handleSkillShareDeleted(
    event: ShareDeletedEvent,
  ): Promise<void> {
    this.logger.info(
      {
        skillId: event.entityId,
        ownerId: event.ownerId,
        remainingScopeCount: event.remainingScopes.length,
      },
      'Cleaning up thread assignments after skill share deletion',
    );

    const lostAccessUserIds =
      await this.shareScopeResolver.resolveLostAccessUserIds(event);

    await this.removeSkillSourcesFromThreads.execute(
      new RemoveSkillSourcesFromThreadsCommand(
        event.entityId,
        lostAccessUserIds,
      ),
    );

    await this.removeKbAssignmentsByOriginSkill.execute(
      new RemoveKnowledgeBaseAssignmentsByOriginSkillCommand(
        event.entityId,
        lostAccessUserIds,
      ),
    );
  }

  private async handleKnowledgeBaseShareDeleted(
    event: ShareDeletedEvent,
  ): Promise<void> {
    this.logger.info(
      {
        knowledgeBaseId: event.entityId,
        ownerId: event.ownerId,
        remainingScopeCount: event.remainingScopes.length,
      },
      'Cleaning up direct thread KB assignments after KB share deletion',
    );

    const lostAccessUserIds =
      await this.shareScopeResolver.resolveLostAccessUserIds(event);

    await this.removeDirectKbFromThreads.execute(
      new RemoveDirectKnowledgeBaseFromThreadsCommand(
        event.entityId,
        lostAccessUserIds,
      ),
    );
  }
}
