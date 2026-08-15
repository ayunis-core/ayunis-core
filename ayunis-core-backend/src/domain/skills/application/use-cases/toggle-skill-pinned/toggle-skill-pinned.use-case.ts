import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from '../../ports/skill.repository';
import { ToggleSkillPinnedCommand } from './toggle-skill-pinned.command';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { SkillNotActiveError, UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SkillAccessService } from '../../services/skill-access.service';

@Injectable()
export class ToggleSkillPinnedUseCase {
  constructor(
    @InjectPinoLogger(ToggleSkillPinnedUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillRepository: SkillRepository,
    private readonly skillAccessService: SkillAccessService,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(
    command: ToggleSkillPinnedCommand,
  ): Promise<{ skill: Skill; isPinned: boolean; isShared: boolean }> {
    this.logger.info({ skillId: command.skillId }, 'Toggling skill pinned');
    try {
      // findAccessibleSkill validates userId and throws UnauthorizedAccessError
      const skill = await this.skillAccessService.findAccessibleSkill(
        command.skillId,
      );
      const userId = this.contextService.get('userId')!;

      // Skill must be active to toggle pinned
      const isActive = await this.skillRepository.isSkillActive(
        command.skillId,
        userId,
      );

      if (!isActive) {
        throw new SkillNotActiveError(command.skillId);
      }

      const isPinned = await this.skillRepository.toggleSkillPinned(
        command.skillId,
        userId,
      );

      const isShared = await this.skillAccessService.resolveIsShared(
        command.skillId,
        userId,
      );

      return { skill, isPinned, isShared };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error toggling skill pinned',
      );
      throw new UnexpectedSkillError(error);
    }
  }
}
