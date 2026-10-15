import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { WorkspaceSkillLinkRepository } from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { LinkSkillsToWorkspaceCommand } from './link-skills-to-workspace.command';

@Injectable()
export class LinkSkillsToWorkspaceUseCase {
  private readonly logger = new Logger(LinkSkillsToWorkspaceUseCase.name);

  constructor(
    private readonly links: WorkspaceSkillLinkRepository,
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly context: ContextService,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWrite: AssertWorkspaceWriteAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: LinkSkillsToWorkspaceCommand): Promise<void> {
    this.logger.log(
      { workspaceId: command.workspaceId, count: command.skillIds.length },
      'Linking skills to workspace',
    );
    const { userId } = getRequiredUserContext(this.context);
    await this.workspaceWrite.execute({ workspaceId: command.workspaceId });
    const skillIds = [...new Set(command.skillIds)];
    const skills = await this.repository.findByIds(skillIds);
    for (const skillId of skillIds) {
      const skill = skills.find(({ id }) => id === skillId);
      if (!skill) throw new SkillNotFoundError(skillId);
      await this.authorization.requireLinkable(skill);
    }
    await this.links.link(command.workspaceId, skillIds, userId);
  }
}
