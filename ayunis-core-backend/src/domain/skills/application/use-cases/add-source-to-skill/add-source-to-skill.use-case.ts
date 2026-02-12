import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { AddSourceToSkillCommand } from './add-source-to-skill.command';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  SkillNotFoundError,
  SkillSourceAlreadyAssignedError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { Skill } from '../../../domain/skill.entity';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class AddSourceToSkillUseCase {
  private readonly logger = new Logger(AddSourceToSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: AddSourceToSkillCommand): Promise<Skill> {
    this.logger.log('Adding source to skill', {
      skillId: command.skillId,
      sourceId: command.sourceId,
    });
    try {
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

      const updatedSkill = new Skill({
        ...skill,
        sourceIds: [...skill.sourceIds, command.sourceId],
      });

      return await this.skillRepository.update(updatedSkill);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error adding source to skill', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
