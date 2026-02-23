import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from '../../ports/skill.repository';
import { ToggleSkillActiveCommand } from './toggle-skill-active.command';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SkillAccessService } from '../../services/skill-access.service';

@Injectable()
export class ToggleSkillActiveUseCase {
  private readonly logger = new Logger(ToggleSkillActiveUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly skillAccessService: SkillAccessService,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: ToggleSkillActiveCommand): Promise<{
    skill: Skill;
    isActive: boolean;
    isPinned: boolean;
    isShared: boolean;
  }> {
    this.logger.log('Toggling skill active', { skillId: command.skillId });
    try {
      // findAccessibleSkill validates userId and returns it to avoid re-reading from context
      const { skill, userId } =
        await this.skillAccessService.findAccessibleSkill(command.skillId);

      const currentlyActive = await this.skillRepository.isSkillActive(
        command.skillId,
        userId,
      );

      if (currentlyActive) {
        await this.skillRepository.deactivateSkill(command.skillId, userId);
      } else {
        await this.skillRepository.activateSkill(command.skillId, userId);
      }

      const isActive = !currentlyActive;

      // When deactivating, pinned state is implicitly cleared (activation row deleted)
      const [isShared, isPinned] = await Promise.all([
        this.skillAccessService.resolveIsShared(command.skillId, userId),
        isActive
          ? this.skillRepository.isSkillPinned(command.skillId, userId)
          : Promise.resolve(false),
      ]);

      return { skill, isActive, isPinned, isShared };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error toggling skill active', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
