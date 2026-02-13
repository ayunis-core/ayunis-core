import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from '../../ports/skill.repository';
import { RemoveSourceFromSkillCommand } from './remove-source-from-skill.command';
import { ContextService } from 'src/common/context/services/context.service';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { Skill } from '../../../domain/skill.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { GetTextSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.use-case';
import { GetTextSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.query';

@Injectable()
export class RemoveSourceFromSkillUseCase {
  private readonly logger = new Logger(RemoveSourceFromSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
    private readonly getSourceByIdUseCase: GetTextSourceByIdUseCase,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
  ) {}

  @Transactional()
  async execute(command: RemoveSourceFromSkillCommand): Promise<void> {
    this.logger.log('Removing source from skill', {
      skillId: command.skillId,
      sourceId: command.sourceId,
    });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const skill = await this.skillRepository.findOne(command.skillId, userId);
      if (!skill) {
        throw new SkillNotFoundError(command.skillId);
      }

      if (!skill.sourceIds.includes(command.sourceId)) {
        return;
      }

      const updatedSkill = new Skill({
        ...skill,
        sourceIds: skill.sourceIds.filter((id) => id !== command.sourceId),
      });

      const source = await this.getSourceByIdUseCase.execute(
        new GetTextSourceByIdQuery(command.sourceId),
      );

      await this.deleteSourceUseCase.execute(new DeleteSourceCommand(source));
      await this.skillRepository.update(updatedSkill);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Error removing source from skill', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
