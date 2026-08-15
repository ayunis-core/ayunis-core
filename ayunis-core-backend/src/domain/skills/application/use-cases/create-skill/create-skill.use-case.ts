import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SkillRepository } from '../../ports/skill.repository';
import { CreateSkillCommand } from './create-skill.command';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  DuplicateSkillNameError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { InvalidSkillNameError } from 'src/domain/skills/domain/skill.entity';

@Injectable()
export class CreateSkillUseCase {
  constructor(
    @InjectPinoLogger(CreateSkillUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: CreateSkillCommand): Promise<Skill> {
    this.logger.info({ name: command.name }, 'Creating skill');
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
      if (
        error instanceof ApplicationError ||
        error instanceof InvalidSkillNameError
      )
        throw error;
      this.logger.error({ err: error as Error }, 'Error creating skill');
      throw new UnexpectedSkillError(error);
    }
  }
}
