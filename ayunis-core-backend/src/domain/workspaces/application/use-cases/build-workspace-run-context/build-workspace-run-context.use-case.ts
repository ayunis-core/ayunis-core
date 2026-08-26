import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceRunContextResolverService } from 'src/domain/workspaces/application/services/workspace-run-context-resolver.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import type { WorkspaceRunContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import { BuildWorkspaceRunContextQuery } from './build-workspace-run-context.query';

@Injectable()
export class BuildWorkspaceRunContextUseCase {
  constructor(
    @InjectPinoLogger(BuildWorkspaceRunContextUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly accessService: WorkspaceAccessService,
    private readonly resolver: WorkspaceRunContextResolverService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: BuildWorkspaceRunContextQuery,
  ): Promise<WorkspaceRunContext> {
    this.logger.info(
      { workspaceId: query.workspaceId },
      'buildWorkspaceRunContext',
    );
    const { workspace } = await this.accessService.requireAccessLevel(
      query.workspaceId,
      WorkspaceAccessLevel.USE,
    );
    const refs = await this.workspacesRepository.getContextRefs(
      query.workspaceId,
    );
    const resources = await this.resolver.resolve(refs);
    return { instruction: workspace.instruction, ...resources };
  }
}
