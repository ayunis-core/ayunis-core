import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { FindActiveSkillsQuery } from './find-active-skills.query';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { SkillShare } from 'src/domain/shares/domain/share.entity';
import { UUID } from 'crypto';

@Injectable()
export class FindActiveSkillsUseCase {
  private readonly logger = new Logger(FindActiveSkillsUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly findSharesByScopeUseCase: FindSharesByScopeUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindActiveSkillsQuery): Promise<Skill[]> {
    this.logger.log('Finding active skills', query);
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      // 1. Fetch owned active skills
      const ownedActiveSkills =
        await this.skillRepository.findActiveByOwner(userId);
      const ownedSkillIds = new Set(ownedActiveSkills.map((s) => s.id));

      // 2. Get all active skill IDs for this user
      const activeSkillIds =
        await this.skillRepository.getActiveSkillIds(userId);

      // 3. Find active skill IDs that are not owned (must be shared)
      const potentialSharedActiveIds: UUID[] = [];
      for (const activeId of activeSkillIds) {
        if (!ownedSkillIds.has(activeId)) {
          potentialSharedActiveIds.push(activeId);
        }
      }

      if (potentialSharedActiveIds.length === 0) {
        return ownedActiveSkills;
      }

      // 4. Verify these are actually shared with the user
      const shares = await this.findSharesByScopeUseCase.execute(
        new FindSharesByScopeQuery(SharedEntityType.SKILL),
      );
      const sharedSkillIds = new Set(
        shares.map((s) => (s as SkillShare).skillId),
      );

      const confirmedSharedActiveIds = potentialSharedActiveIds.filter((id) =>
        sharedSkillIds.has(id),
      );

      if (confirmedSharedActiveIds.length === 0) {
        return ownedActiveSkills;
      }

      // 5. Fetch the shared active skills
      const sharedActiveSkills = await this.skillRepository.findByIds(
        confirmedSharedActiveIds,
      );

      return [...ownedActiveSkills, ...sharedActiveSkills];
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error finding active skills', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
