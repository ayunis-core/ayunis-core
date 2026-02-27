import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeResolverService } from 'src/domain/shares/application/services/share-scope-resolver.service';
import { FindSkillsByKnowledgeBaseAndOwnersUseCase } from 'src/domain/skills/application/use-cases/find-skills-by-knowledge-base-and-owners/find-skills-by-knowledge-base-and-owners.use-case';
import { FindSkillsByKnowledgeBaseAndOwnersQuery } from 'src/domain/skills/application/use-cases/find-skills-by-knowledge-base-and-owners/find-skills-by-knowledge-base-and-owners.query';
import { RemoveKnowledgeBaseFromSkillsUseCase } from 'src/domain/skills/application/use-cases/remove-knowledge-base-from-skills/remove-knowledge-base-from-skills.use-case';
import { RemoveKnowledgeBaseFromSkillsCommand } from 'src/domain/skills/application/use-cases/remove-knowledge-base-from-skills/remove-knowledge-base-from-skills.command';
import { FindAllSharesByEntityUseCase } from 'src/domain/shares/application/use-cases/find-all-shares-by-entity/find-all-shares-by-entity.use-case';
import { FindAllSharesByEntityQuery } from 'src/domain/shares/application/use-cases/find-all-shares-by-entity/find-all-shares-by-entity.query';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase } from 'src/domain/threads/application/use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.use-case';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillCommand } from 'src/domain/threads/application/use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.command';
import type { UUID } from 'crypto';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import type { Share } from 'src/domain/shares/domain/share.entity';
import type { RemainingShareScope } from 'src/domain/shares/application/events/share-deleted.event';
import {
  OrgShareScope,
  TeamShareScope,
} from 'src/domain/shares/domain/share-scope.entity';

@Injectable()
export class KnowledgeBaseShareDeletedListener {
  private readonly logger = new Logger(KnowledgeBaseShareDeletedListener.name);

  constructor(
    private readonly findSkillsByKbAndOwners: FindSkillsByKnowledgeBaseAndOwnersUseCase,
    private readonly removeKbFromSkills: RemoveKnowledgeBaseFromSkillsUseCase,
    private readonly findAllSharesByEntity: FindAllSharesByEntityUseCase,
    private readonly removeKbAssignmentsByOriginSkill: RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase,
    private readonly shareScopeResolver: ShareScopeResolverService,
  ) {}

  @OnEvent(ShareDeletedEvent.EVENT_NAME)
  async handleShareDeleted(event: ShareDeletedEvent): Promise<void> {
    if (event.entityType !== SharedEntityType.KNOWLEDGE_BASE) {
      return;
    }

    this.logger.log('Cascading KB share deletion through skills and threads', {
      knowledgeBaseId: event.entityId,
      ownerId: event.ownerId,
      remainingScopeCount: event.remainingScopes.length,
    });

    const lostAccessUserIds =
      await this.shareScopeResolver.resolveLostAccessUserIds(
        event.orgId,
        event.ownerId,
        event.remainingScopes,
      );

    if (lostAccessUserIds.length === 0) {
      return;
    }

    const affectedSkills = await this.findSkillsByKbAndOwners.execute(
      new FindSkillsByKnowledgeBaseAndOwnersQuery(
        event.entityId,
        lostAccessUserIds,
      ),
    );

    if (affectedSkills.length === 0) {
      return;
    }

    const affectedSkillIds = affectedSkills.map((s) => s.id);
    await this.removeKbFromSkills.execute(
      new RemoveKnowledgeBaseFromSkillsCommand(
        event.entityId,
        affectedSkillIds,
      ),
    );

    this.logger.log('Removed KB from affected skills', {
      knowledgeBaseId: event.entityId,
      affectedSkillCount: affectedSkillIds.length,
    });

    await this.cascadeToSharedSkillThreads(affectedSkills, event.entityId);
  }

  private async cascadeToSharedSkillThreads(
    affectedSkills: Skill[],
    knowledgeBaseId: UUID,
  ): Promise<void> {
    for (const skill of affectedSkills) {
      const skillShares = await this.findAllSharesByEntity.execute(
        new FindAllSharesByEntityQuery(skill.id, SharedEntityType.SKILL),
      );

      if (skillShares.length === 0) {
        continue;
      }

      const allSkillShareUserIds = await this.resolveAllSkillShareUserIds(
        skillShares,
        skill.userId,
      );

      const allUserIds = [skill.userId, ...allSkillShareUserIds];

      await this.removeKbAssignmentsByOriginSkill.execute(
        new RemoveKnowledgeBaseAssignmentsByOriginSkillCommand(
          skill.id,
          allUserIds,
          knowledgeBaseId,
        ),
      );

      this.logger.log(
        'Removed KB thread assignments originating from shared skill',
        {
          skillId: skill.id,
          knowledgeBaseId,
          userCount: allUserIds.length,
        },
      );
    }
  }

  private async resolveAllSkillShareUserIds(
    skillShares: Share[],
    ownerId: UUID,
  ): Promise<UUID[]> {
    const allScopes: RemainingShareScope[] = skillShares
      .map((share) => this.toRemainingScope(share))
      .filter((s): s is RemainingShareScope => s !== null);

    const userIds = await this.shareScopeResolver.resolveUserIds(allScopes);
    userIds.delete(ownerId);
    return [...userIds];
  }

  private toRemainingScope(share: Share): RemainingShareScope | null {
    const { scope } = share;
    if (scope instanceof OrgShareScope) {
      return { scopeType: scope.scopeType, scopeId: scope.orgId };
    }
    if (scope instanceof TeamShareScope) {
      return { scopeType: scope.scopeType, scopeId: scope.teamId };
    }
    return null;
  }
}
