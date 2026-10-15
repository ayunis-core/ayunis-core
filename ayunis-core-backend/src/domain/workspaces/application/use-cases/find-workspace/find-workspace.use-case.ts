import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  WorkspaceSummaryService,
  type WorkspaceSummary,
} from 'src/domain/workspaces/application/services/workspace-summary.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { FindWorkspaceQuery } from './find-workspace.query';

export interface WorkspaceDetail extends WorkspaceSummary {
  workspace: Workspace;
}

@Injectable()
export class FindWorkspaceUseCase {
  private readonly logger = new Logger(FindWorkspaceUseCase.name);

  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly summaries: WorkspaceSummaryService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: FindWorkspaceQuery): Promise<WorkspaceDetail> {
    this.logger.log({ workspaceId: query.id }, 'Finding workspace');
    const { workspace, level } = await this.access.require(query.id, 'use');
    const summary = (await this.summaries.summarize([workspace])).get(
      workspace.id,
    );
    return {
      workspace,
      accessLevel: level,
      memberCount: summary?.memberCount ?? 1,
    };
  }
}
