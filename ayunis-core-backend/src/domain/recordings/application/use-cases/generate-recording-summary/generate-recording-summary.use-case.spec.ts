import { randomUUID, type UUID } from 'crypto';
import type { RecordingAudio } from 'src/domain/recordings/application/models/recording-audio';
import type { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import type {
  GeneratedRecordingSummary,
  RecordingSummaryRepository,
} from 'src/domain/recordings/application/ports/recording-summary.repository';
import type { RecordingSummaryWriter } from 'src/domain/recordings/application/services/recording-summary-writer.service';
import { RecordingSummaryStatus } from 'src/domain/recordings/domain/recording-summary-status.enum';
import { RecordingSummary } from 'src/domain/recordings/domain/recording-summary.entity';
import { TeamRecording } from 'src/domain/recordings/domain/team-recording.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { IndexTranscriptSummaryCommand } from 'src/domain/sources/application/use-cases/index-transcript-summary/index-transcript-summary.command';
import type { IndexTranscriptSummaryUseCase } from 'src/domain/sources/application/use-cases/index-transcript-summary/index-transcript-summary.use-case';
import { GenerateRecordingSummaryCommand } from './generate-recording-summary.command';
import { GenerateRecordingSummaryUseCase } from './generate-recording-summary.use-case';

describe(GenerateRecordingSummaryUseCase.name, () => {
  const orgId = randomUUID();
  const uploaderId = randomUUID();
  const runId = randomUUID();
  const recording = new TeamRecording({
    name: 'Bauausschuss',
    orgId,
    teamId: randomUUID(),
    createdByUserId: uploaderId,
  });
  const audio: RecordingAudio = {
    sourceId: randomUUID(),
    fileName: 'bauausschuss.mp3',
    storageKey: null,
    sourceStatus: SourceStatus.READY,
    failureCode: null,
  };
  const generated: GeneratedRecordingSummary = {
    content: '## Thema\n\nHaushalt 2027',
    modelId: randomUUID(),
    modelName: 'Mistral Large (Mistral)',
    generatedAt: new Date(),
  };

  function setup(
    options: {
      storedContent?: string;
      claimed?: boolean;
      contentSaved?: boolean;
    } = {},
  ) {
    const summary = new RecordingSummary({
      recordingId: recording.id,
      runId,
      status: RecordingSummaryStatus.RUNNING,
      triggeredByUserId: uploaderId,
      content: options.storedContent,
    });
    const summaries = {
      claim: jest
        .fn()
        .mockResolvedValue(options.claimed === false ? null : summary),
      saveContent: jest.fn().mockResolvedValue(options.contentSaved ?? true),
      markReady: jest.fn().mockResolvedValue(true),
    };
    const recordings = {
      findById: jest.fn().mockResolvedValue(recording),
      findAudio: jest
        .fn()
        .mockResolvedValue(
          new Map<UUID, RecordingAudio>([[recording.id, audio]]),
        ),
    };
    const writer = { write: jest.fn().mockResolvedValue(generated) };
    const indexed: IndexTranscriptSummaryCommand[] = [];
    const index = {
      execute: (command: IndexTranscriptSummaryCommand) => {
        indexed.push(command);
        return Promise.resolve(true);
      },
    };
    const useCase = new GenerateRecordingSummaryUseCase(
      recordings as unknown as RecordingRepository,
      summaries as unknown as RecordingSummaryRepository,
      writer as unknown as RecordingSummaryWriter,
      index as unknown as IndexTranscriptSummaryUseCase,
    );
    return { useCase, summaries, writer, indexed };
  }

  const command = new GenerateRecordingSummaryCommand(
    recording.id,
    runId,
    uploaderId,
  );

  it("bills the run to its user, stores the summary and indexes it with the recording's transcript", async () => {
    const { useCase, summaries, writer, indexed } = setup();

    await useCase.execute(command);

    expect(writer.write).toHaveBeenCalledWith(
      recording,
      audio.sourceId,
      uploaderId,
    );
    expect(summaries.saveContent).toHaveBeenCalledWith(
      recording.id,
      runId,
      generated,
    );
    expect(indexed).toEqual([
      { sourceId: audio.sourceId, orgId, summary: generated.content },
    ]);
    expect(summaries.markReady).toHaveBeenCalledWith(recording.id, runId);
  });

  it('indexes a summary an earlier attempt stored without generating and billing it again', async () => {
    const { useCase, writer, indexed, summaries } = setup({
      storedContent: '## Thema\n\nFrüher erzeugt',
    });

    await useCase.execute(command);

    expect(writer.write).not.toHaveBeenCalled();
    expect(indexed.map(({ summary }) => summary)).toEqual([
      '## Thema\n\nFrüher erzeugt',
    ]);
    expect(summaries.markReady).toHaveBeenCalled();
  });

  it('indexes nothing when the recording was deleted while its summary was generated', async () => {
    const { useCase, indexed, summaries } = setup({ contentSaved: false });

    await useCase.execute(command);

    expect(indexed).toEqual([]);
    expect(summaries.markReady).not.toHaveBeenCalled();
  });

  it('generates nothing for a run that is no longer current', async () => {
    const { useCase, writer, indexed } = setup({ claimed: false });

    await useCase.execute(command);

    expect(writer.write).not.toHaveBeenCalled();
    expect(indexed).toEqual([]);
  });
});
