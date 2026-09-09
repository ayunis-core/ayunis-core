import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { UpdateWorkspaceSkillUseCase as MutateSkillUseCase } from 'src/domain/skills/application/use-cases/update-workspace-skill/update-workspace-skill.use-case';
import { FindWorkspaceSkillUseCase } from 'src/domain/skills/application/use-cases/find-workspace-skill/find-workspace-skill.use-case';
import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
@Injectable()
export class UpdateWorkspaceSkillUseCase {
  private readonly logger = new Logger(UpdateWorkspaceSkillUseCase.name);
  constructor(
    private readonly access: AssertWorkspaceWriteAccessUseCase,
    private readonly mutate: MutateSkillUseCase,
    private readonly find: FindWorkspaceSkillUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: {
    workspaceId: UUID;
    skillId: UUID;
    values: Pick<WorkspaceSkill, 'name' | 'shortDescription' | 'instructions'>;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'update-workspace-skill',
    );
    await this.access.execute({ workspaceId: command.workspaceId });
    await this.mutate.execute(command);
    return this.find.execute(command);
  }
}
