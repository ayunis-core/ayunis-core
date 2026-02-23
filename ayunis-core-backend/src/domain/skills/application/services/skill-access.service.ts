import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SkillRepository } from '../ports/skill.repository';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillNotFoundError } from '../skills.errors';
import { Skill } from '../../domain/skill.entity';

export interface SkillUserContext {
  isActive: boolean;
  isShared: boolean;
  isPinned: boolean;
}

export interface SkillUserContextBatch {
  activeSkillIds: Set<UUID>;
  pinnedSkillIds: Set<UUID>;
}

@Injectable()
export class SkillAccessService {
  private readonly logger = new Logger(SkillAccessService.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly findShareByEntityUseCase: FindShareByEntityUseCase,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Finds a skill accessible to the current user (owned or shared).
   * Throws SkillNotFoundError if the skill doesn't exist or isn't accessible.
   */
  async findAccessibleSkill(skillId: UUID): Promise<Skill> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    // Try owned skill first
    let skill = await this.skillRepository.findOne(skillId, userId);

    // If not owned, check if shared with user
    if (!skill) {
      const share = await this.findShareByEntityUseCase.execute(
        new FindShareByEntityQuery(SharedEntityType.SKILL, skillId),
      );

      if (share) {
        const sharedSkills = await this.skillRepository.findByIds([skillId]);
        skill = sharedSkills.length > 0 ? sharedSkills[0] : null;
      }
    }

    if (!skill) {
      throw new SkillNotFoundError(skillId);
    }

    return skill;
  }

  /**
   * Resolves whether a skill is shared with the given user.
   * Returns false for skill owners, even if the skill has been shared.
   */
  async resolveIsShared(skillId: UUID, userId: UUID): Promise<boolean> {
    const ownedSkill = await this.skillRepository.findOne(skillId, userId);
    if (ownedSkill) {
      return false;
    }

    const share = await this.findShareByEntityUseCase.execute(
      new FindShareByEntityQuery(SharedEntityType.SKILL, skillId),
    );
    return share !== null;
  }

  /**
   * Resolves the full user context (isActive, isPinned, isShared) for a single skill.
   * Uses the current user from ContextService.
   */
  async resolveUserContext(skillId: UUID): Promise<SkillUserContext> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const [isActive, isPinned, isShared] = await Promise.all([
      this.skillRepository.isSkillActive(skillId, userId),
      this.skillRepository.isSkillPinned(skillId, userId),
      this.resolveIsShared(skillId, userId),
    ]);

    return { isActive, isShared, isPinned };
  }

  /**
   * Resolves batch user context (active + pinned IDs) for the current user.
   * Used by list endpoints to avoid N+1 queries.
   */
  async resolveUserContextBatch(): Promise<SkillUserContextBatch> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const [activeSkillIds, pinnedSkillIds] = await Promise.all([
      this.skillRepository.getActiveSkillIds(userId),
      this.skillRepository.getPinnedSkillIds(userId),
    ]);

    return { activeSkillIds, pinnedSkillIds };
  }
}
