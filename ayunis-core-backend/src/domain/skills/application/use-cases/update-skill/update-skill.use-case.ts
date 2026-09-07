import { InvalidSkillNameError } from 'src/domain/skills/domain/abstract-skill.entity';
import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { UpdateSkillCommand } from './update-skill.command';

import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class UpdateSkillUseCase {
  private readonly logger = new Logger(UpdateSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  @Transactional()
  async execute(command: UpdateSkillCommand): Promise<PersonalSkill> {
    this.logger.log({ skillId: command.skillId }, 'Updating skill');
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const existingSkill = await this.skillRepository.findOne(
      command.skillId,
      userId,
    );
    if (!existingSkill) throw new SkillNotFoundError(command.skillId);

    let updatedSkill: PersonalSkill;
    try {
      updatedSkill = existingSkill.withUpdates({
        ...existingSkill,
        name: command.name,
        shortDescription: command.shortDescription,
        instructions: command.instructions,
        updatedAt: new Date(),
      });
    } catch (error) {
      if (error instanceof InvalidSkillNameError) {
        throw new SkillInvalidInputError(error.message);
      }
      throw error;
    }

    if (command.name !== existingSkill.name) {
      const duplicate = await this.skillRepository.findByNameAndOwner(
        command.name,
        userId,
      );
      if (duplicate) throw new DuplicateSkillNameError(command.name);
    }

    return this.skillRepository.update(updatedSkill, existingSkill);
  }
}
