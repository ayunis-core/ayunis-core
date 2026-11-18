import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import type { RecordingDetails } from 'src/domain/recordings/application/models/recording-details';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';

/** Adds the creator's name and the uploaded audio to recordings, in one lookup each. */
@Injectable()
export class RecordingDetailsService {
  constructor(
    private readonly repository: RecordingRepository,
    private readonly findUsersByIds: FindUsersByIdsUseCase,
  ) {}

  async describe(recordings: Recording[]): Promise<RecordingDetails[]> {
    const [names, audio] = await Promise.all([
      this.creatorNames(recordings),
      this.repository.findAudio(recordings.map(({ id }) => id)),
    ]);
    return recordings.map((recording) => ({
      recording,
      creatorName: recording.createdByUserId
        ? (names.get(recording.createdByUserId) ?? null)
        : null,
      audio: audio.get(recording.id) ?? null,
    }));
  }

  private async creatorNames(
    recordings: Recording[],
  ): Promise<Map<UUID, string>> {
    const creatorIds = [
      ...new Set(
        recordings.flatMap(({ createdByUserId }) =>
          createdByUserId ? [createdByUserId] : [],
        ),
      ),
    ];
    if (creatorIds.length === 0) return new Map();
    const users = await this.findUsersByIds.execute(
      new FindUsersByIdsQuery(creatorIds),
    );
    return new Map(users.map((user) => [user.id, user.name]));
  }
}
