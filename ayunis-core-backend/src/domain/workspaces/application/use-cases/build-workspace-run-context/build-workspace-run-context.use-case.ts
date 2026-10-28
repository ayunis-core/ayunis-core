import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { GetWorkspaceAiContextQuery } from 'src/domain/workspaces/application/use-cases/get-workspace-ai-context/get-workspace-ai-context.query';
import { GetWorkspaceAiContextUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-ai-context/get-workspace-ai-context.use-case';
import type { WorkspaceRunContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import { BuildWorkspaceRunContextQuery } from './build-workspace-run-context.query';

@Injectable()
export class BuildWorkspaceRunContextUseCase {
  private readonly logger = new Logger(BuildWorkspaceRunContextUseCase.name);

  constructor(
    private readonly getWorkspaceAiContext: GetWorkspaceAiContextUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: BuildWorkspaceRunContextQuery,
  ): Promise<WorkspaceRunContext> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'buildWorkspaceRunContext',
    );
    const context = await this.getWorkspaceAiContext.execute(
      new GetWorkspaceAiContextQuery(query.workspaceId),
    );

    return {
      ...context,
      runtimeKnowledgeBases: context.knowledgeBases,
    };
  }
}
