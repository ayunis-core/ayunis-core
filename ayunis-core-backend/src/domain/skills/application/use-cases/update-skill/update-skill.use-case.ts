import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { UpdateSkillCommand } from './update-skill.command';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  DuplicateSkillNameError,
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
  async execute(command: UpdateSkillCommand): Promise<Skill> {
    this.logger.log({ skillId: command.skillId }, 'Updating skill');
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const existingSkill = await this.skillRepository.findOne(
      command.skillId,
      userId,
    );
    if (!existingSkill) throw new SkillNotFoundError(command.skillId);

    if (command.name !== existingSkill.name) {
      const duplicate = await this.skillRepository.findByNameAndOwner(
        command.name,
        userId,
      );
      if (duplicate) throw new DuplicateSkillNameError(command.name);
    }

    const updatedSkill = new Skill({
      ...existingSkill,
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      updatedAt: new Date(),
    });

    return this.skillRepository.update(updatedSkill);
  }
}
