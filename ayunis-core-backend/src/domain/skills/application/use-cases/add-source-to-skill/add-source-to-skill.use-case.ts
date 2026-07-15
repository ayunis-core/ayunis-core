import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from '../../ports/skill.repository';
import { AddSourceToSkillCommand } from './add-source-to-skill.command';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  SkillNotFoundError,
  SkillSourceAlreadyAssignedError,
  SkillSourceLimitExceededError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { Skill } from '../../../domain/skill.entity';
import { SkillsConstants } from '../../../domain/skills.constants';

@Injectable()
export class AddSourceToSkillUseCase {
  private readonly logger = new Logger(AddSourceToSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: AddSourceToSkillCommand): Promise<Skill> {
    this.logger.log('Adding source to skill', {
      skillId: command.skillId,
      sourceId: command.sourceId,
    });
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const skill = await this.skillRepository.findOne(command.skillId, userId);
    if (!skill) {
      throw new SkillNotFoundError(command.skillId);
    }

    if (skill.sourceIds.includes(command.sourceId)) {
      throw new SkillSourceAlreadyAssignedError(command.sourceId);
    }

    if (skill.sourceIds.length >= SkillsConstants.MAX_SOURCES) {
      throw new SkillSourceLimitExceededError(SkillsConstants.MAX_SOURCES);
    }

    const updatedSkill = new Skill({
      ...skill,
      sourceIds: [...skill.sourceIds, command.sourceId],
    });

    return this.skillRepository.update(updatedSkill);
  }
}
