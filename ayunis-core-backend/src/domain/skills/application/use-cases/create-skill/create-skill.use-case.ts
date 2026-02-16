import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from '../../ports/skill.repository';
import { CreateSkillCommand } from './create-skill.command';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  DuplicateSkillNameError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class CreateSkillUseCase {
  private readonly logger = new Logger(CreateSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
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
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error creating skill', { error: error as Error });
      throw new UnexpectedSkillError(error);
    }
  }
}
