import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { DeferredCleanupEvent } from 'src/common/events/deferred-cleanup.event';
import type { RecordingAudio } from 'src/domain/recordings/application/models/recording-audio';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';

/** What a deletion has to clean up once the recordings' rows are gone. */
export interface DeletedRecordings {
  recordings: Recording[];
  /** The recordings' audio, by recording id. */
  audio: Map<UUID, RecordingAudio>;
}

/**
 * Cleans up after recordings whose rows are gone. Every way a recording is
 * deleted ends here: deleting it directly, and deleting its user, team,
 * workspace or organization, whose rows take it along by FK cascade. The
 * cascade also removes the audio source with its transcript, segments and
 * index entries; what lives outside the database (a queued or running
 * transcription, processing results and the uploaded original) is removed
 * here.
 */
@Injectable()
export class RecordingCleanupService {
  private readonly logger = new Logger(RecordingCleanupService.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly cleanupSourceProcessing: CleanupSourceProcessingUseCase,
  ) {}

  /** Reads what the cleanup needs; call it before the rows are deleted. */
  async snapshot(recordings: Recording[]): Promise<DeletedRecordings> {
    const audio = await this.repository.findAudio(
      recordings.map(({ id }) => id),
    );
    return { recordings, audio };
  }

  /** Registers the cleanup to run once the owner's row delete succeeded. */
  async deferCleanup(
    event: DeferredCleanupEvent,
    recordings: Recording[],
    owner: string,
  ): Promise<void> {
    if (recordings.length === 0) return;
    const deleted = await this.snapshot(recordings);
    event.deferCleanup(`clean up recordings of the deleted ${owner}`, () =>
      this.cleanUp(deleted),
    );
  }

  async cleanUp(deleted: DeletedRecordings): Promise<void> {
    this.logger.log(
      { recordingIds: deleted.recordings.map(({ id }) => id) },
      'Recordings deleted',
    );
    for (const [orgId, audio] of audioByOrg(deleted)) {
      await this.cleanupSourceProcessing.execute(
        new CleanupSourceProcessingCommand(
          audio.map(({ sourceId }) => sourceId),
          orgId,
          audio.flatMap(({ storageKey }) => (storageKey ? [storageKey] : [])),
        ),
      );
    }
  }
}

function audioByOrg({
  recordings,
  audio,
}: DeletedRecordings): Map<UUID, RecordingAudio[]> {
  const groups = new Map<UUID, RecordingAudio[]>();
  for (const recording of recordings) {
    const recordingAudio = audio.get(recording.id);
    if (!recordingAudio) continue;
    groups.set(recording.orgId, [
      ...(groups.get(recording.orgId) ?? []),
      recordingAudio,
    ]);
  }
  return groups;
}
