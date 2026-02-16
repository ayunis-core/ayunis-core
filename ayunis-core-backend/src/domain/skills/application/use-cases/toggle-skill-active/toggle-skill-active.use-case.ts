import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from '../../ports/skill.repository';
import { ToggleSkillActiveCommand } from './toggle-skill-active.command';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';

@Injectable()
export class ToggleSkillActiveUseCase {
  private readonly logger = new Logger(ToggleSkillActiveUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly findShareByEntityUseCase: FindShareByEntityUseCase,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(
    command: ToggleSkillActiveCommand,
  ): Promise<{ skill: Skill; isActive: boolean }> {
    this.logger.log('Toggling skill active', { skillId: command.skillId });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      // Try owned skill first
      let skill = await this.skillRepository.findOne(command.skillId, userId);

      // If not owned, check if shared with user
      if (!skill) {
        const share = await this.findShareByEntityUseCase.execute(
          new FindShareByEntityQuery(SharedEntityType.SKILL, command.skillId),
        );

        if (share) {
          const sharedSkills = await this.skillRepository.findByIds([
            command.skillId,
          ]);
          skill = sharedSkills.length > 0 ? sharedSkills[0] : null;
        }
      }

      if (!skill) {
        throw new SkillNotFoundError(command.skillId);
      }

      const currentlyActive = await this.skillRepository.isSkillActive(
        command.skillId,
        userId,
      );

      if (currentlyActive) {
        await this.skillRepository.deactivateSkill(command.skillId, userId);
      } else {
        await this.skillRepository.activateSkill(command.skillId, userId);
      }

      return { skill, isActive: !currentlyActive };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error toggling skill active', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
