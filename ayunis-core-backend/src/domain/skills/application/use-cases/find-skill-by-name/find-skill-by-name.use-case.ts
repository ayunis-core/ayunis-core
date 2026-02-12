import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { FindSkillByNameQuery } from './find-skill-by-name.query';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindSkillByNameUseCase {
  private readonly logger = new Logger(FindSkillByNameUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindSkillByNameQuery): Promise<Skill> {
    this.logger.log('Finding skill by name', { name: query.name });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      const skill = await this.skillRepository.findByNameAndOwner(
        query.name,
        userId,
      );

      if (!skill) {
        throw new SkillNotFoundError(query.name);
      }

      return skill;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error finding skill by name', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
