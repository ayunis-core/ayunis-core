import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  WorkspaceSummaryService,
  type WorkspaceDetail,
} from 'src/domain/workspaces/application/services/workspace-summary.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { FindWorkspaceQuery } from './find-workspace.query';

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
    return this.summaries.detail(await this.access.require(query.id, 'use'));
  }
}
