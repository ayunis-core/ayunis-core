import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import {
  type AccessibleWorkspace,
  WorkspaceAccess,
} from 'src/domain/workspaces/application/models/workspace-access.model';
import { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { assertValidWorkspaceFields } from 'src/domain/workspaces/application/util/workspace-fields';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { CreateWorkspaceCommand } from './create-workspace.command';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class CreateWorkspaceUseCase {
  private readonly logger = new Logger(CreateWorkspaceUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceMembersRepository: WorkspaceMembersRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: CreateWorkspaceCommand): Promise<AccessibleWorkspace> {
    this.logger.log('Creating workspace');

    assertValidWorkspaceFields({
      name: command.name,
      description: command.description ?? null,
      icon: command.icon,
      color: command.color,
    });

    const { userId, orgId } = getRequiredUserContext(this.contextService);
    const workspace = new Workspace({
      orgId,
      name: command.name,
      description: command.description,
      icon: command.icon,
      color: command.color,
    });

    return {
      workspace: await this.createWithAdmin(workspace, userId),
      access: WorkspaceAccess.forAdmin(),
    };
  }

  @Transactional()
  private async createWithAdmin(
    workspace: Workspace,
    creatorId: UUID,
  ): Promise<Workspace> {
    const created = await this.workspacesRepository.save(workspace);
    await this.workspaceMembersRepository.create(
      new WorkspaceMember({
        workspaceId: created.id,
        userId: creatorId,
        role: UserRole.ADMIN,
      }),
    );
    return created;
  }
}
