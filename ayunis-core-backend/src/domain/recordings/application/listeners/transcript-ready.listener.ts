import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TranscriptReadyEvent } from 'src/domain/sources/application/events/transcript-ready.event';
import { StartRecordingSummaryCommand } from 'src/domain/recordings/application/use-cases/start-recording-summary/start-recording-summary.command';
import { StartRecordingSummaryUseCase } from 'src/domain/recordings/application/use-cases/start-recording-summary/start-recording-summary.use-case';

/** Summarizes a recording once its transcript is ready. */
@Injectable()
export class RecordingsTranscriptReadyListener {
  constructor(private readonly startSummary: StartRecordingSummaryUseCase) {}

  @OnEvent(TranscriptReadyEvent.EVENT_NAME, { suppressErrors: false })
  async handle(event: TranscriptReadyEvent): Promise<void> {
    await this.startSummary.execute(
      new StartRecordingSummaryCommand(event.sourceId, event.orgId),
    );
  }
}
