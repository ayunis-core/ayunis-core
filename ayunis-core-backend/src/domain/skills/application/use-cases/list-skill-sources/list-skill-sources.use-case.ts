import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ListSkillSourcesQuery } from './list-skill-sources.query';
import { SkillRepository } from '../../ports/skill.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class ListSkillSourcesUseCase {
  private readonly logger = new Logger(ListSkillSourcesUseCase.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly sourceRepository: SourceRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: ListSkillSourcesQuery): Promise<Source[]> {
    this.logger.log('Listing sources for skill', { skillId: query.skillId });

    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const skill = await this.skillRepository.findOne(query.skillId, userId);
      if (!skill) {
        throw new SkillNotFoundError(query.skillId);
      }

      if (skill.sourceIds.length === 0) {
        return [];
      }

      return this.sourceRepository.findByIds(skill.sourceIds);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error listing skill sources', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
