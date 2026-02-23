import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SkillRepository } from '../../ports/skill.repository';
import { FindAllSkillsQuery } from './find-all-skills.query';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { SkillShare } from 'src/domain/shares/domain/share.entity';

/**
 * Result type that includes skill and whether it's shared
 */
export interface SkillWithShareStatus {
  skill: Skill;
  isShared: boolean;
}

/**
 * Full result from findAll including per-user context (active/pinned IDs)
 */
export interface FindAllSkillsResult {
  skills: SkillWithShareStatus[];
  activeSkillIds: Set<UUID>;
  pinnedSkillIds: Set<UUID>;
}

/**
 * Use case for finding all skills accessible to the current user
 * Includes both owned skills and skills shared with the user's organization or teams
 */
@Injectable()
export class FindAllSkillsUseCase {
  private readonly logger = new Logger(FindAllSkillsUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly findSharesByScopeUseCase: FindSharesByScopeUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindAllSkillsQuery): Promise<FindAllSkillsResult> {
    this.logger.log('Finding all skills', query);

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // 1. Fetch owned skills and user context in parallel
    const [ownedSkills, shares, activeSkillIds, pinnedSkillIds] =
      await Promise.all([
        this.skillRepository.findAllByOwner(userId),
        this.findSharesByScopeUseCase.execute(
          new FindSharesByScopeQuery(SharedEntityType.SKILL),
        ),
        this.skillRepository.getActiveSkillIds(userId),
        this.skillRepository.getPinnedSkillIds(userId),
      ]);

    const ownedSkillIds = ownedSkills.map((s) => s.id);

    this.logger.debug('Found owned skills', { count: ownedSkills.length });

    // 2. Extract shared skill IDs and deduplicate against owned
    const sharedSkillIds = shares
      .map((s) => (s as SkillShare).skillId)
      .filter((id) => !ownedSkillIds.includes(id));

    this.logger.debug('Found shared skills after deduplication', {
      count: sharedSkillIds.length,
    });

    // 3. Fetch shared skills
    const sharedSkills =
      sharedSkillIds.length > 0
        ? await this.skillRepository.findByIds(sharedSkillIds)
        : [];

    // 4. Combine results with isShared flag
    const ownedResults: SkillWithShareStatus[] = ownedSkills.map((skill) => ({
      skill,
      isShared: false,
    }));

    const sharedResults: SkillWithShareStatus[] = sharedSkills.map((skill) => ({
      skill,
      isShared: true,
    }));

    return {
      skills: [...ownedResults, ...sharedResults],
      activeSkillIds,
      pinnedSkillIds,
    };
  }
}
