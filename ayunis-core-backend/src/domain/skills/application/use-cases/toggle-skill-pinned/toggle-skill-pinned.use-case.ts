import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from '../../ports/skill.repository';
import { ToggleSkillPinnedCommand } from './toggle-skill-pinned.command';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { SkillNotActiveError, UnexpectedSkillError } from '../../skills.errors';
import { SkillAccessService } from '../../services/skill-access.service';

@Injectable()
export class ToggleSkillPinnedUseCase {
  private readonly logger = new Logger(ToggleSkillPinnedUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly skillAccessService: SkillAccessService,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    command: ToggleSkillPinnedCommand,
  ): Promise<{ skill: Skill; isPinned: boolean; isShared: boolean }> {
    this.logger.log('Toggling skill pinned', { skillId: command.skillId });
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
  }
}
