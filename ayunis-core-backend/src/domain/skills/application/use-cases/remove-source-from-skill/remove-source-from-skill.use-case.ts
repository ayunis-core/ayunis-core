import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import type { Skill } from 'src/domain/skills/domain/skill';
import { RemoveSourceFromSkillCommand } from './remove-source-from-skill.command';

@Injectable()
export class RemoveSourceFromSkillUseCase {
  private readonly logger = new Logger(RemoveSourceFromSkillUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly context: ContextService,
    private readonly deleteSource: DeleteSourceUseCase,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: RemoveSourceFromSkillCommand): Promise<void> {
    this.logger.log(command, 'Removing source from skill');
    const skill = await this.repository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    await this.authorization.requireWrite(skill);
    const orgId = this.requireOrgId();
    await this.removeSource(skill, command.sourceId, orgId);
  }

  private async removeSource(
    skill: Skill,
    sourceId: UUID,
    orgId: UUID,
  ): Promise<void> {
    if (!skill.sourceIds.includes(sourceId)) return;
    await this.deleteSource.execute(new DeleteSourceCommand(sourceId, orgId));
    await this.repository.update(
      skill.withUpdates({
        sourceIds: skill.sourceIds.filter((id) => id !== sourceId),
      }),
      skill,
    );
  }

  private requireOrgId(): UUID {
    const orgId = this.context.get('orgId');
    if (!orgId) throw new UnauthorizedAccessError();
    return orgId;
  }
}
