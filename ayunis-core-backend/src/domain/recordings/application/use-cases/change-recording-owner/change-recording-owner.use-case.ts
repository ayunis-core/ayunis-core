import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  isOwnedBy,
  recordingOwnedBy,
} from 'src/domain/recordings/application/models/recording-owner';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import {
  RecordingNotFoundError,
  RecordingOwnerChangeNotAllowedError,
  UnexpectedRecordingError,
} from 'src/domain/recordings/application/recordings.errors';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { WorkspaceRecording } from 'src/domain/recordings/domain/workspace-recording.entity';
import { ChangeRecordingOwnerCommand } from './change-recording-owner.command';

/**
 * Moves a recording between the caller, a team and the organization. Takes
 * the right to manage both the current and the new owner; workspace
 * recordings stay in their workspace.
 */
@Injectable()
export class ChangeRecordingOwnerUseCase {
  private readonly logger = new Logger(ChangeRecordingOwnerUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly access: RecordingAccessService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  @Transactional()
  async execute(command: ChangeRecordingOwnerCommand): Promise<Recording> {
    this.logger.log(
      { recordingId: command.recordingId, ownerType: command.owner.type },
      'Changing recording owner',
    );
    const { userId } = getRequiredUserContext(this.context);
    // The lock keeps a concurrent rename from undoing the move.
    const recording = await this.repository.findById(command.recordingId, {
      lock: true,
    });
    if (!recording) throw new RecordingNotFoundError(command.recordingId);
    await this.access.requireWrite(recording);
    if (recording instanceof WorkspaceRecording) {
      throw new RecordingOwnerChangeNotAllowedError(recording.id);
    }
    if (isOwnedBy(recording, command.owner, userId)) return recording;

    const moved = recordingOwnedBy(
      command.owner,
      {
        id: recording.id,
        name: recording.name,
        orgId: recording.orgId,
        createdByUserId: recording.createdByUserId,
        createdAt: recording.createdAt,
      },
      userId,
    );
    await this.access.requireCreate(moved);
    return this.repository.save(moved);
  }
}
