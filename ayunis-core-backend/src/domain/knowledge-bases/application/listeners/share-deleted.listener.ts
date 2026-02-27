import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeResolverService } from 'src/domain/shares/application/services/share-scope-resolver.service';
import { SharesRepository } from 'src/domain/shares/application/ports/shares-repository.port';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
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
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    @Inject(SharesRepository)
    private readonly sharesRepository: SharesRepository,
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
      await this.shareScopeResolver.resolveLostAccessUserIds(event);

    if (lostAccessUserIds.length === 0) {
      return;
    }

    // Find skills owned by lost-access users that reference this KB
    const affectedSkills =
      await this.skillRepository.findSkillsByKnowledgeBaseAndOwners(
        event.entityId,
        lostAccessUserIds,
      );

    if (affectedSkills.length === 0) {
      return;
    }

    // Remove KB from those skills
    const affectedSkillIds = affectedSkills.map((s) => s.id);
    await this.skillRepository.removeKnowledgeBaseFromSkills(
      event.entityId,
      affectedSkillIds,
    );

    this.logger.log('Removed KB from affected skills', {
      knowledgeBaseId: event.entityId,
      affectedSkillCount: affectedSkillIds.length,
    });

    // For each affected skill that is itself shared, clean up thread KB
    // assignments that originated from that skill (for ALL users, since the
    // KB is no longer accessible through the skill)
    await this.cascadeToSharedSkillThreads(affectedSkills);
  }

  private async cascadeToSharedSkillThreads(
    affectedSkills: Skill[],
  ): Promise<void> {
    for (const skill of affectedSkills) {
      const skillShares = await this.sharesRepository.findByEntityIdAndType(
        skill.id,
        SharedEntityType.SKILL,
      );

      if (skillShares.length === 0) {
        continue;
      }

      // Resolve ALL users who have access to this skill via shares
      const allSkillShareUserIds = await this.resolveAllSkillShareUserIds(
        skillShares,
        skill.userId,
      );

      // Include the skill owner — their threads also have this KB via skill
      const allUserIds = [skill.userId, ...allSkillShareUserIds];

      await this.removeKbAssignmentsByOriginSkill.execute(
        new RemoveKnowledgeBaseAssignmentsByOriginSkillCommand(
          skill.id,
          allUserIds,
        ),
      );

      this.logger.log(
        'Removed KB thread assignments originating from shared skill',
        {
          skillId: skill.id,
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
