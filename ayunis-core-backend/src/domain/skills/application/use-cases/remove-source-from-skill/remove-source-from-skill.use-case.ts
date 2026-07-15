import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from '../../ports/skill.repository';
import { RemoveSourceFromSkillCommand } from './remove-source-from-skill.command';
import { ContextService } from 'src/common/context/services/context.service';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { Skill } from '../../../domain/skill.entity';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';

@Injectable()
export class RemoveSourceFromSkillUseCase {
  private readonly logger = new Logger(RemoveSourceFromSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: RemoveSourceFromSkillCommand): Promise<void> {
    this.logger.log('Removing source from skill', {
      skillId: command.skillId,
      sourceId: command.sourceId,
    });
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

    await this.deleteSourceUseCase.execute(
      new DeleteSourceCommand(command.sourceId),
    );
    await this.skillRepository.update(updatedSkill);
  }
}
