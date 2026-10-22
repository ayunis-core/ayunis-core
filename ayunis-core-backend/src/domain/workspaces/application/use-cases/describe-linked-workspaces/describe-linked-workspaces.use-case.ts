import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { NameOwnersQuery } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.query';
import { NameOwnersUseCase } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.use-case';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import type { LinkedWorkspaces } from 'src/domain/workspaces/domain/workspace-link';
import { DescribeLinkedWorkspacesQuery } from './describe-linked-workspaces.query';

@Injectable()
export class DescribeLinkedWorkspacesUseCase {
  private readonly logger = new Logger(DescribeLinkedWorkspacesUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly nameOwners: NameOwnersUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: DescribeLinkedWorkspacesQuery,
  ): Promise<LinkedWorkspaces> {
    this.logger.debug(
      { count: query.links.length },
      'Describing linked workspaces',
    );
    const workspaces = await this.workspacesRepository.findAllAccessibleByIds(
      getRequiredUserContext(this.context),
      query.links.map(({ workspaceId }) => workspaceId),
    );
    const linkedBy = new Map(
      query.links.map((link) => [link.workspaceId, link.linkedByUserId]),
    );
    const names = await this.nameOwners.execute(
      new NameOwnersQuery([], [...linkedBy.values()]),
    );
    return {
      total: query.links.length,
      workspaces: workspaces
        .map((workspace) => ({
          workspace,
          linkedBy: names.person(linkedBy.get(workspace.id) ?? null),
        }))
        .sort((a, b) => a.workspace.name.localeCompare(b.workspace.name)),
    };
  }
}
