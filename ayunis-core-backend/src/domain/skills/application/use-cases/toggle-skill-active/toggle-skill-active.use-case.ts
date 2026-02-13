import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from '../../ports/skill.repository';
import { ToggleSkillActiveCommand } from './toggle-skill-active.command';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class ToggleSkillActiveUseCase {
  private readonly logger = new Logger(ToggleSkillActiveUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: ToggleSkillActiveCommand): Promise<Skill> {
    this.logger.log('Toggling skill active', { skillId: command.skillId });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      const skill = await this.skillRepository.findOne(command.skillId, userId);
      if (!skill) {
        throw new SkillNotFoundError(command.skillId);
      }

      const updatedSkill = new Skill({
        ...skill,
        isActive: !skill.isActive,
        updatedAt: new Date(),
      });

      return this.skillRepository.update(updatedSkill);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error toggling skill active', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
