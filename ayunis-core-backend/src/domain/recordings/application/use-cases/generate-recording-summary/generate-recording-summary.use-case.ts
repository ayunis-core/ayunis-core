import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { RecordingAudio } from 'src/domain/recordings/application/models/recording-audio';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { RecordingSummaryRepository } from 'src/domain/recordings/application/ports/recording-summary.repository';
import { UnexpectedRecordingError } from 'src/domain/recordings/application/recordings.errors';
import { RecordingSummaryWriter } from 'src/domain/recordings/application/services/recording-summary-writer.service';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { IndexTranscriptSummaryCommand } from 'src/domain/sources/application/use-cases/index-transcript-summary/index-transcript-summary.command';
import { IndexTranscriptSummaryUseCase } from 'src/domain/sources/application/use-cases/index-transcript-summary/index-transcript-summary.use-case';
import { GenerateRecordingSummaryCommand } from './generate-recording-summary.command';

/**
 * One attempt of a summary run: generate the summary, store it, index it
 * with the transcript and mark it ready. A summary that was stored before an
 * attempt failed is indexed without being generated (and billed) again. When
 * the run was superseded or its recording deleted, the attempt stops at the
 * next step and writes nothing; errors are left to the caller, which decides
 * between retrying and failing the run.
 */
@Injectable()
export class GenerateRecordingSummaryUseCase {
  private readonly logger = new Logger(GenerateRecordingSummaryUseCase.name);

  constructor(
    private readonly recordings: RecordingRepository,
    private readonly summaries: RecordingSummaryRepository,
    private readonly writer: RecordingSummaryWriter,
    private readonly indexTranscriptSummary: IndexTranscriptSummaryUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(command: GenerateRecordingSummaryCommand): Promise<void> {
    const { recordingId, runId } = command;
    this.logger.log({ recordingId, runId }, 'Generating recording summary');
    const summary = await this.summaries.claim(recordingId, runId);
    const recording = summary
      ? await this.recordings.findById(recordingId)
      : null;
    const audio = recording
      ? (await this.recordings.findAudio([recordingId])).get(recordingId)
      : undefined;
    if (!summary || !recording || !audio) {
      this.logger.log(
        { recordingId, runId },
        'Run superseded or finished, or recording deleted, skipping',
      );
      return;
    }
    const content =
      summary.content ?? (await this.generate(recording, audio, command));
    if (content === null) return;
    const indexed = await this.indexTranscriptSummary.execute(
      new IndexTranscriptSummaryCommand(
        audio.sourceId,
        recording.orgId,
        content,
      ),
    );
    if (indexed) await this.summaries.markReady(recordingId, runId);
  }

  /** The generated summary, or null when it could no longer be stored. */
  private async generate(
    recording: Recording,
    audio: RecordingAudio,
    { runId, billedUserId }: GenerateRecordingSummaryCommand,
  ): Promise<string | null> {
    const generated = await this.writer.write(
      recording,
      audio.sourceId,
      billedUserId,
    );
    const saved = await this.summaries.saveContent(
      recording.id,
      runId,
      generated,
    );
    return saved ? generated.content : null;
  }
}
