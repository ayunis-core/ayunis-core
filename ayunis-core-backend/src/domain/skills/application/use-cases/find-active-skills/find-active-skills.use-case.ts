import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { FindActiveSkillsQuery } from './find-active-skills.query';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindActiveSkillsUseCase {
  private readonly logger = new Logger(FindActiveSkillsUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindActiveSkillsQuery): Promise<Skill[]> {
    this.logger.log('Finding active skills', query);
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      return this.skillRepository.findActiveByOwner(userId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error finding active skills', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
