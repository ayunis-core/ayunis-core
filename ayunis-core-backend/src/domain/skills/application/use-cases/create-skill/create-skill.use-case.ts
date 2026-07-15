import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from '../../ports/skill.repository';
import { CreateSkillCommand } from './create-skill.command';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { InvalidSkillNameError } from '../../../domain/skill.entity';

@Injectable()
export class CreateSkillUseCase {
  private readonly logger = new Logger(CreateSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: CreateSkillCommand): Promise<Skill> {
    this.logger.log('Creating skill', { name: command.name });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      // Check for duplicate name
      const existing = await this.skillRepository.findByNameAndOwner(
        command.name,
        userId,
      );
      if (existing) {
        throw new DuplicateSkillNameError(command.name);
      }

      const skill = new Skill({
        name: command.name,
        shortDescription: command.shortDescription,
        instructions: command.instructions,
        userId,
      });

      const created = await this.skillRepository.create(skill);

      if (command.isActive) {
        await this.skillRepository.activateSkill(created.id, userId);
      }

      return created;
    } catch (error) {
      // InvalidSkillNameError is a plain Error; translate it so the decorator
      // does not wrap it into a 500.
      if (error instanceof InvalidSkillNameError) {
        throw new SkillInvalidInputError(error.message);
      }
      throw error;
    }
  }
}
