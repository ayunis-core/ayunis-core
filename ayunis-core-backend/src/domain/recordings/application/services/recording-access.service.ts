import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { RecordingNotFoundError } from 'src/domain/recordings/application/recordings.errors';
import { CollectiveRecordingAccessService } from 'src/domain/recordings/application/services/collective-recording-access.service';
import { PersonalRecording } from 'src/domain/recordings/domain/personal-recording.entity';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { WorkspaceRecording } from 'src/domain/recordings/domain/workspace-recording.entity';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';

/**
 * Who may read and manage a recording, decided by its owner. Unreadable
 * recordings are reported as not found; readable but unmanageable team and
 * organization recordings as forbidden. The `manage_recordings` permission
 * every managing route requires is checked by the route itself.
 */
@Injectable()
export class RecordingAccessService {
  constructor(
    private readonly context: ContextService,
    private readonly collectiveAccess: CollectiveRecordingAccessService,
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
    private readonly workspaceWrite: AssertWorkspaceWriteAccessUseCase,
  ) {}

  async requireRead(recording: Recording): Promise<void> {
    const userId = this.requireSameOrganization(recording);
    if (recording instanceof PersonalRecording) {
      this.requirePersonalOwner(recording, userId);
    } else if (recording instanceof WorkspaceRecording) {
      await this.hideWorkspaceDenial(recording.id, () =>
        this.workspaceRead.execute({ workspaceId: recording.workspaceId }),
      );
    } else {
      await this.collectiveAccess.requireRead(recording);
    }
  }

  async requireWrite(recording: Recording): Promise<void> {
    const userId = this.requireSameOrganization(recording);
    if (recording instanceof PersonalRecording) {
      this.requirePersonalOwner(recording, userId);
    } else if (recording instanceof WorkspaceRecording) {
      await this.hideWorkspaceDenial(recording.id, () =>
        this.workspaceWrite.execute({ workspaceId: recording.workspaceId }),
      );
    } else {
      await this.collectiveAccess.requireWrite(recording);
    }
  }

  /**
   * For recordings about to be created for, or moved to, their owner: a team
   * or the organization the user may not manage is forbidden rather than
   * hidden, and an inaccessible workspace is reported as such.
   */
  async requireCreate(recording: Recording): Promise<void> {
    const userId = this.requireSameOrganization(recording);
    if (recording instanceof PersonalRecording) {
      this.requirePersonalOwner(recording, userId);
    } else if (recording instanceof WorkspaceRecording) {
      await this.workspaceWrite.execute({
        workspaceId: recording.workspaceId,
      });
    } else {
      await this.collectiveAccess.requireManage(recording);
    }
  }

  private requireSameOrganization(recording: Recording): UUID {
    const { userId, orgId } = getRequiredUserContext(this.context);
    if (recording.orgId !== orgId) {
      throw new RecordingNotFoundError(recording.id);
    }
    return userId;
  }

  private requirePersonalOwner(
    recording: PersonalRecording,
    userId: UUID,
  ): void {
    if (recording.userId !== userId) {
      throw new RecordingNotFoundError(recording.id);
    }
  }

  private async hideWorkspaceDenial(
    recordingId: UUID,
    authorize: () => Promise<void>,
  ): Promise<void> {
    try {
      await authorize();
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        throw new RecordingNotFoundError(recordingId);
      }
      throw error;
    }
  }
}
