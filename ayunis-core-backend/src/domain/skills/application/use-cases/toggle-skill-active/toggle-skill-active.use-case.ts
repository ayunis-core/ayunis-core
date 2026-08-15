import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from '../../ports/skill.repository';
import { ToggleSkillActiveCommand } from './toggle-skill-active.command';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SkillAccessService } from '../../services/skill-access.service';

@Injectable()
export class ToggleSkillActiveUseCase {
  constructor(
    @InjectPinoLogger(ToggleSkillActiveUseCase.name)
    private readonly logger: PinoLogger,
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
    this.logger.info({ skillId: command.skillId }, 'Toggling skill active');
    try {
      // findAccessibleSkill validates userId and throws UnauthorizedAccessError
      const skill = await this.skillAccessService.findAccessibleSkill(
        command.skillId,
      );
      const userId = this.contextService.get('userId')!;

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error toggling skill active',
      );
      throw new UnexpectedSkillError(error);
    }
  }
}
