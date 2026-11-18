import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { UnexpectedRecordingError } from 'src/domain/recordings/application/recordings.errors';
import type { RecordingDetails } from 'src/domain/recordings/application/models/recording-details';
import { CollectiveRecordingAccessService } from 'src/domain/recordings/application/services/collective-recording-access.service';
import { RecordingDetailsService } from 'src/domain/recordings/application/services/recording-details.service';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { ListRecordingsQuery } from './list-recordings.query';

/**
 * The personal scope lists the user's own recordings and those of their teams
 * and organization; the workspace scope those of one workspace.
 */
@Injectable()
export class ListRecordingsUseCase {
  private readonly logger = new Logger(ListRecordingsUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly collectiveAccess: CollectiveRecordingAccessService,
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
    private readonly details: RecordingDetailsService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(query: ListRecordingsQuery): Promise<RecordingDetails[]> {
    this.logger.log({ scope: query.scope.type }, 'Listing recordings');
    return this.details.describe(await this.findInScope(query));
  }

  private async findInScope(query: ListRecordingsQuery): Promise<Recording[]> {
    const { userId } = getRequiredUserContext(this.context);
    if (query.scope.type === 'workspace') {
      await this.workspaceRead.execute({
        workspaceId: query.scope.workspaceId,
      });
      return this.repository.findAllByWorkspaceId(query.scope.workspaceId);
    }
    const owners = await this.collectiveAccess.readableOwners();
    return this.repository.findAllReadable(userId, owners);
  }
}
