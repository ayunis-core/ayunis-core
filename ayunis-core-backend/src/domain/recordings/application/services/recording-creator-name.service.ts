import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { RecordingWithCreator } from 'src/domain/recordings/application/models/recording-with-creator';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';

@Injectable()
export class RecordingCreatorNameService {
  constructor(private readonly findUsersByIds: FindUsersByIdsUseCase) {}

  async withCreators(recordings: Recording[]): Promise<RecordingWithCreator[]> {
    const creatorIds = [
      ...new Set(
        recordings.flatMap(({ createdByUserId }) =>
          createdByUserId ? [createdByUserId] : [],
        ),
      ),
    ];
    const names = new Map<UUID, string>();
    if (creatorIds.length > 0) {
      const users = await this.findUsersByIds.execute(
        new FindUsersByIdsQuery(creatorIds),
      );
      users.forEach((user) => names.set(user.id, user.name));
    }
    return recordings.map((recording) => ({
      recording,
      creatorName: recording.createdByUserId
        ? (names.get(recording.createdByUserId) ?? null)
        : null,
    }));
  }
}
