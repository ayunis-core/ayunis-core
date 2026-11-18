import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { RecordingCleanupService } from 'src/domain/recordings/application/services/recording-cleanup.service';
import { TeamDeletionRequestedEvent } from 'src/iam/teams/application/events/team-deletion-requested.event';

@Injectable()
export class RecordingsTeamDeletionRequestedListener {
  private readonly logger = new Logger(
    RecordingsTeamDeletionRequestedListener.name,
  );

  constructor(
    private readonly repository: RecordingRepository,
    private readonly cleanup: RecordingCleanupService,
  ) {}

  @OnEvent(TeamDeletionRequestedEvent.EVENT_NAME)
  async handle(event: TeamDeletionRequestedEvent): Promise<void> {
    try {
      const recordings = await this.repository.findAllByTeamId(event.teamId);
      await this.cleanup.deferCleanup(event, recordings, 'team');
    } catch (error) {
      this.logger.error(
        { teamId: event.teamId, err: error as Error },
        'Failed to resolve recordings for team deletion',
      );
    }
  }
}
