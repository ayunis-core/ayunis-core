import { randomUUID } from 'crypto';
import type { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { RecordingNotFoundError } from 'src/domain/recordings/application/recordings.errors';
import type { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { TeamRecording } from 'src/domain/recordings/domain/team-recording.entity';
import { WorkspaceRecording } from 'src/domain/recordings/domain/workspace-recording.entity';
import { FindCitedRecordingQuery } from './find-cited-recording.query';
import { FindCitedRecordingUseCase } from './find-cited-recording.use-case';

describe(FindCitedRecordingUseCase.name, () => {
  const orgId = randomUUID();
  const workspaceId = randomUUID();
  const createdAt = new Date('2026-03-02T09:30:00Z');
  const teamRecording = new TeamRecording({
    name: 'Bauausschuss März',
    orgId,
    teamId: randomUUID(),
    createdByUserId: randomUUID(),
    createdAt,
  });
  const workspaceRecording = new WorkspaceRecording({
    name: 'Klausurtagung',
    orgId,
    workspaceId,
    createdByUserId: randomUUID(),
    createdAt,
  });

  function setup(
    recording: Recording | null,
    { recordingsEnabled = true, readable = true } = {},
  ) {
    const repository = {
      findById: jest.fn().mockResolvedValue(recording),
    } as unknown as RecordingRepository;
    const access = {
      requireRead: jest.fn(() =>
        readable
          ? Promise.resolve()
          : Promise.reject(new RecordingNotFoundError(recording!.id)),
      ),
    } as unknown as RecordingAccessService;
    return new FindCitedRecordingUseCase(repository, access, {
      get: () => recordingsEnabled,
    } as never);
  }

  it('returns a readable recording with its name and upload time', async () => {
    await expect(
      setup(teamRecording).execute(
        new FindCitedRecordingQuery(teamRecording.id, null),
      ),
    ).resolves.toEqual({
      id: teamRecording.id,
      name: 'Bauausschuss März',
      uploadedAt: createdAt,
    });
  });

  it('hides a recording the user can no longer read', async () => {
    await expect(
      setup(teamRecording, { readable: false }).execute(
        new FindCitedRecordingQuery(teamRecording.id, null),
      ),
    ).rejects.toThrow(RecordingNotFoundError);
  });

  it('hides every recording with recordings turned off', async () => {
    await expect(
      setup(teamRecording, { recordingsEnabled: false }).execute(
        new FindCitedRecordingQuery(teamRecording.id, null),
      ),
    ).rejects.toThrow(RecordingNotFoundError);
  });

  it("returns a workspace recording only in that workspace's chat", async () => {
    const useCase = setup(workspaceRecording);

    await expect(
      useCase.execute(
        new FindCitedRecordingQuery(workspaceRecording.id, workspaceId),
      ),
    ).resolves.toMatchObject({ id: workspaceRecording.id });
    await expect(
      useCase.execute(new FindCitedRecordingQuery(workspaceRecording.id, null)),
    ).rejects.toThrow(RecordingNotFoundError);
    await expect(
      useCase.execute(
        new FindCitedRecordingQuery(workspaceRecording.id, randomUUID()),
      ),
    ).rejects.toThrow(RecordingNotFoundError);
  });

  it('hides a deleted recording', async () => {
    await expect(
      setup(null).execute(new FindCitedRecordingQuery(randomUUID(), null)),
    ).rejects.toThrow(RecordingNotFoundError);
  });
});
