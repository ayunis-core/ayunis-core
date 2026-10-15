import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceSkillLinkRepository } from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { UnlinkSkillFromWorkspaceCommand } from './unlink-skill-from-workspace.command';

@Injectable()
export class UnlinkSkillFromWorkspaceUseCase {
  private readonly logger = new Logger(UnlinkSkillFromWorkspaceUseCase.name);

  constructor(
    private readonly links: WorkspaceSkillLinkRepository,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWrite: AssertWorkspaceWriteAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: UnlinkSkillFromWorkspaceCommand): Promise<void> {
    this.logger.log(command, 'Unlinking skill from workspace');
    await this.workspaceWrite.execute({ workspaceId: command.workspaceId });
    await this.links.unlink(command.workspaceId, command.skillId);
  }
}
