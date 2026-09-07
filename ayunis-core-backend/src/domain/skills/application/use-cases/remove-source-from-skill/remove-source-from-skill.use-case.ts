import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { RemoveSourceFromSkillCommand } from './remove-source-from-skill.command';
import { ContextService } from 'src/common/context/services/context.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';

import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';

@Injectable()
export class RemoveSourceFromSkillUseCase {
  private readonly logger = new Logger(RemoveSourceFromSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: RemoveSourceFromSkillCommand): Promise<void> {
    this.logger.log(
      {
        skillId: command.skillId,
        sourceId: command.sourceId,
      },
      'Removing source from skill',
    );

    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const skill = await this.skillRepository.findOne(command.skillId, userId);
    if (!skill) {
      throw new SkillNotFoundError(command.skillId);
    }
    await this.removeSource(skill, command.sourceId, orgId);
  }

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async executeForAuthorizedSkill(
    authorizedSkill: Skill,
    sourceId: UUID,
  ): Promise<void> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) throw new UnauthorizedException('User not authenticated');
    const skill = (
      await this.skillRepository.findByIds([authorizedSkill.id])
    ).find(
      (candidate) =>
        (candidate instanceof PersonalSkill &&
          authorizedSkill instanceof PersonalSkill &&
          candidate.userId === authorizedSkill.userId) ||
        (candidate instanceof WorkspaceSkill &&
          authorizedSkill instanceof WorkspaceSkill &&
          candidate.workspaceId === authorizedSkill.workspaceId),
    );
    if (!skill) throw new SkillNotFoundError(authorizedSkill.id);
    await this.removeSource(skill, sourceId, orgId);
  }

  private async removeSource(
    skill: Skill,
    sourceId: UUID,
    orgId: UUID,
  ): Promise<void> {
    if (!skill.sourceIds.includes(sourceId)) return;
    await this.deleteSourceUseCase.execute(
      new DeleteSourceCommand(sourceId, orgId),
    );
    await this.skillRepository.update(
      skill.withUpdates({
        ...skill,
        sourceIds: skill.sourceIds.filter((id) => id !== sourceId),
      }),
      skill,
    );
  }
}
