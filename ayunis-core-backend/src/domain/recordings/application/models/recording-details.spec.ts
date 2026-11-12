import { randomUUID } from 'crypto';
import { RecordingStatus } from 'src/domain/recordings/domain/recording-status.enum';
import { RecordingSummaryStatus } from 'src/domain/recordings/domain/recording-summary-status.enum';
import { RecordingSummary } from 'src/domain/recordings/domain/recording-summary.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { RecordingAudio } from './recording-audio';
import { recordingStatusOf } from './recording-details';

describe(recordingStatusOf.name, () => {
  const audio = (sourceStatus: SourceStatus): RecordingAudio => ({
    sourceId: randomUUID(),
    fileName: 'sitzung.mp3',
    storageKey: null,
    sourceStatus,
    failureCode: null,
  });
  const summary = (status: RecordingSummaryStatus) =>
    new RecordingSummary({
      recordingId: randomUUID(),
      runId: randomUUID(),
      status,
      triggeredByUserId: randomUUID(),
    });

  it('reads as summarizing from the moment the transcript is ready until the summary is done, so the page keeps polling', () => {
    expect(
      recordingStatusOf({
        audio: audio(SourceStatus.READY),
        summary: summary(RecordingSummaryStatus.PENDING),
      }),
    ).toBe(RecordingStatus.SUMMARIZING);
    expect(
      recordingStatusOf({
        audio: audio(SourceStatus.READY),
        summary: summary(RecordingSummaryStatus.FAILED),
      }),
    ).toBe(RecordingStatus.READY);
  });

  it('reads as transcribing or failed while the summary waits for a transcript that is not ready', () => {
    const waiting = summary(RecordingSummaryStatus.PENDING);
    expect(
      recordingStatusOf({
        audio: audio(SourceStatus.PROCESSING),
        summary: waiting,
      }),
    ).toBe(RecordingStatus.TRANSCRIBING);
    expect(
      recordingStatusOf({
        audio: audio(SourceStatus.FAILED),
        summary: waiting,
      }),
    ).toBe(RecordingStatus.FAILED);
  });
});
