import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { FindSkillByNameQuery } from './find-skill-by-name.query';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { SkillShare } from 'src/domain/shares/domain/share.entity';

@Injectable()
export class FindSkillByNameUseCase {
  private readonly logger = new Logger(FindSkillByNameUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly findSharesByScopeUseCase: FindSharesByScopeUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindSkillByNameQuery): Promise<Skill> {
    this.logger.log('Finding skill by name', { name: query.name });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      // Owned skills take priority
      const ownedSkill = await this.skillRepository.findByNameAndOwner(
        query.name,
        userId,
      );

      if (ownedSkill) {
        return ownedSkill;
      }

      // Check shared skills
      const shares = await this.findSharesByScopeUseCase.execute(
        new FindSharesByScopeQuery(SharedEntityType.SKILL),
      );

      if (shares.length > 0) {
        const sharedSkillIds = shares.map((s) => (s as SkillShare).skillId);
        const sharedSkills =
          await this.skillRepository.findByIds(sharedSkillIds);
        const matchingSkill = sharedSkills.find((s) => s.name === query.name);

        if (matchingSkill) {
          return matchingSkill;
        }
      }

      throw new SkillNotFoundError(query.name);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error finding skill by name', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
