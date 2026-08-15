import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SkillRepository } from '../../ports/skill.repository';
import { AddSourceToSkillCommand } from './add-source-to-skill.command';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  SkillNotFoundError,
  SkillSourceAlreadyAssignedError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { assertSkillHasSourceCapacity } from '../../util/skill-source-capacity';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class AddSourceToSkillUseCase {
  constructor(
    @InjectPinoLogger(AddSourceToSkillUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: AddSourceToSkillCommand): Promise<Skill> {
    this.logger.info(
      {
        skillId: command.skillId,
        sourceId: command.sourceId,
      },
      'Adding source to skill',
    );
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

      assertSkillHasSourceCapacity(skill.sourceIds);

      const updatedSkill = new Skill({
        ...skill,
        sourceIds: [...skill.sourceIds, command.sourceId],
      });

      return await this.skillRepository.update(updatedSkill);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error adding source to skill',
      );
      throw new UnexpectedSkillError(error);
    }
  }
}
