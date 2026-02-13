import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { FindOneSkillQuery } from './find-one-skill.query';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindOneSkillUseCase {
  private readonly logger = new Logger(FindOneSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindOneSkillQuery): Promise<Skill> {
    this.logger.log('Finding skill', { id: query.id });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      const skill = await this.skillRepository.findOne(query.id, userId);
      if (!skill) {
        throw new SkillNotFoundError(query.id);
      }

      return skill;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error finding skill', { error: error as Error });
      throw new UnexpectedSkillError(error);
    }
  }
}
