import { randomUUID, type UUID } from 'crypto';
import type { RecordingAudio } from 'src/domain/recordings/application/models/recording-audio';
import { OrgRecording } from 'src/domain/recordings/domain/org-recording.entity';
import { PersonalRecording } from 'src/domain/recordings/domain/personal-recording.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { RecordingCleanupService } from './recording-cleanup.service';

describe('RecordingCleanupService', () => {
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  const cleanupSourceProcessing = { execute: jest.fn() };
  const findAudio = jest.fn<Promise<Map<UUID, RecordingAudio>>, [UUID[]]>();
  const service = new RecordingCleanupService(
    { findAudio } as never,
    cleanupSourceProcessing as never,
  );

  function audio(storageKey: string | null): RecordingAudio {
    return {
      sourceId: randomUUID(),
      fileName: 'sitzung.mp3',
      storageKey,
      sourceStatus: SourceStatus.PROCESSING,
      failureCode: null,
    };
  }

  it("cancels the transcription and releases the original of each deleted recording's audio, per organization", async () => {
    const transcribing = new PersonalRecording({
      name: 'Gemeinderat',
      orgId,
      userId: randomUUID(),
      createdByUserId: null,
    });
    const withoutAudio = new OrgRecording({
      name: 'Bauausschuss',
      orgId,
      createdByUserId: null,
    });
    const elsewhere = new OrgRecording({
      name: 'Kreistag',
      orgId: otherOrgId,
      createdByUserId: null,
    });
    const transcribingAudio = audio(`${orgId}/uploads/a/sitzung.mp3`);
    const releasedAudio = audio(null);
    findAudio.mockResolvedValue(
      new Map([
        [transcribing.id, transcribingAudio],
        [elsewhere.id, releasedAudio],
      ]),
    );

    const deleted = await service.snapshot([
      transcribing,
      withoutAudio,
      elsewhere,
    ]);
    await service.cleanUp(deleted);

    const commands = cleanupSourceProcessing.execute.mock.calls.map(
      ([command]: [CleanupSourceProcessingCommand]) => ({ ...command }),
    );
    expect(commands).toEqual([
      {
        sourceIds: [transcribingAudio.sourceId],
        orgId,
        storageKeys: [`${orgId}/uploads/a/sitzung.mp3`],
      },
      {
        sourceIds: [releasedAudio.sourceId],
        orgId: otherOrgId,
        storageKeys: [],
      },
    ]);
  });
});
