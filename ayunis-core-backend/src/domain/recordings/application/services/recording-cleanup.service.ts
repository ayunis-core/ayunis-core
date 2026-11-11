import { Injectable, Logger } from '@nestjs/common';
import type { DeferredCleanupEvent } from 'src/common/events/deferred-cleanup.event';
import type { Recording } from 'src/domain/recordings/domain/recording';

/**
 * Cleans up after recordings whose rows are gone. Every way a recording is
 * deleted ends here: deleting it directly, and deleting its user, team,
 * workspace or organization, whose rows take it along by FK cascade. Nothing
 * outside the database belongs to a recording yet, so there is nothing to
 * remove but the record of the deletion.
 */
@Injectable()
export class RecordingCleanupService {
  private readonly logger = new Logger(RecordingCleanupService.name);

  /** Registers the cleanup to run once the owner's row delete succeeded. */
  deferCleanup(
    event: DeferredCleanupEvent,
    recordings: Recording[],
    owner: string,
  ): void {
    if (recordings.length === 0) return;
    event.deferCleanup(`clean up recordings of the deleted ${owner}`, () =>
      this.cleanUp(recordings),
    );
  }

  cleanUp(recordings: Recording[]): Promise<void> {
    this.logger.log(
      { recordingIds: recordings.map(({ id }) => id) },
      'Recordings deleted',
    );
    return Promise.resolve();
  }
}
