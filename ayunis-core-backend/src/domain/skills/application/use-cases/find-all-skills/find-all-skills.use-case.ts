import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { FindAllSkillsQuery } from './find-all-skills.query';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindAllSkillsUseCase {
  private readonly logger = new Logger(FindAllSkillsUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindAllSkillsQuery): Promise<Skill[]> {
    this.logger.log('Finding all skills', query);
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      return this.skillRepository.findAllByOwner(userId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error finding skills', { error: error as Error });
      throw new UnexpectedSkillError(error);
    }
  }
}
