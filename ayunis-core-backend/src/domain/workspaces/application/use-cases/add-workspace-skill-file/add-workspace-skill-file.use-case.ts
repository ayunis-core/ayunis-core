import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { GetWorkspaceSkillUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-skill/get-workspace-skill.use-case';
import { AddFileSourceToSkillUseCase as SourceOperationUseCase } from 'src/domain/skills/application/use-cases/add-file-source-to-skill/add-file-source-to-skill.use-case';
import type { UploadedFileRef } from 'src/common/util/source-file-upload';
@Injectable()
export class AddWorkspaceSkillFileUseCase {
  private readonly logger = new Logger(AddWorkspaceSkillFileUseCase.name);
  constructor(
    private readonly find: GetWorkspaceSkillUseCase,
    private readonly operation: SourceOperationUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: {
    workspaceId: UUID;
    skillId: UUID;
    file: UploadedFileRef;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'add-workspace-skill-file',
    );
    const context = await this.find.execute(command);
    await this.operation.executeForAuthorizedSkill(context.skill, command.file);
    return this.find.execute(command);
  }
}
