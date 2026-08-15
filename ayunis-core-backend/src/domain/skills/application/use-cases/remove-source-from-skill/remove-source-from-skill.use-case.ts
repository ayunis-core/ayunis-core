import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from '../../ports/skill.repository';
import { RemoveSourceFromSkillCommand } from './remove-source-from-skill.command';
import { ContextService } from 'src/common/context/services/context.service';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';

@Injectable()
export class RemoveSourceFromSkillUseCase {
  constructor(
    @InjectPinoLogger(RemoveSourceFromSkillUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
  ) {}

  @Transactional()
  async execute(command: RemoveSourceFromSkillCommand): Promise<void> {
    this.logger.info(
      {
        skillId: command.skillId,
        sourceId: command.sourceId,
      },
      'Removing source from skill',
    );
    try {
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
      if (!userId || !orgId) {
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

      await this.deleteSourceUseCase.execute(
        new DeleteSourceCommand(command.sourceId, orgId),
      );
      await this.skillRepository.update(updatedSkill);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Error removing source from skill',
      );
      throw new UnexpectedSkillError(error);
    }
  }
}
