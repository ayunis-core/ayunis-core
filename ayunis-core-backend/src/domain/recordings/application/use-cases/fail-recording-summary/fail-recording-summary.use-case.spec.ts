import { randomUUID } from 'crypto';
import { ProviderTimeoutError } from 'src/common/errors/provider.errors';
import { NoRecordingSummaryModelError } from 'src/domain/models/application/recording-summary-model.errors';
import type { RecordingSummaryRepository } from 'src/domain/recordings/application/ports/recording-summary.repository';
import { RecordingTranscriptTooLongError } from 'src/domain/recordings/application/recordings.errors';
import { RecordingSummaryFailure } from 'src/domain/recordings/domain/recording-summary-failure.enum';
import { TeamCreditLimitExceededError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';
import { FailRecordingSummaryCommand } from './fail-recording-summary.command';
import { FailRecordingSummaryUseCase } from './fail-recording-summary.use-case';

describe(FailRecordingSummaryUseCase.name, () => {
  const recordingId = randomUUID();
  const runId = randomUUID();

  it.each([
    [
      new NoRecordingSummaryModelError(randomUUID()),
      RecordingSummaryFailure.NO_SUMMARY_MODEL,
    ],
    [
      new CreditBudgetExceededError(),
      RecordingSummaryFailure.CREDIT_BUDGET_EXCEEDED,
    ],
    [
      new TeamCreditLimitExceededError(),
      RecordingSummaryFailure.CREDIT_LIMIT_EXCEEDED,
    ],
    [
      new RecordingTranscriptTooLongError({
        transcriptTokens: 2,
        contextWindow: 1,
      }),
      RecordingSummaryFailure.TRANSCRIPT_TOO_LONG,
    ],
    [
      new ProviderTimeoutError({
        provider: 'mistral',
        modelId: 'mistral-large',
      }),
      RecordingSummaryFailure.PROVIDER_ERROR,
    ],
    [
      new Error('Connection terminated'),
      RecordingSummaryFailure.SUMMARY_FAILED,
    ],
  ])('fails the run after %p with the reason %s', async (error, failure) => {
    const summaries = { markFailed: jest.fn().mockResolvedValue(true) };
    const useCase = new FailRecordingSummaryUseCase(
      summaries as unknown as RecordingSummaryRepository,
    );

    await useCase.execute(
      new FailRecordingSummaryCommand(recordingId, runId, error),
    );

    expect(summaries.markFailed).toHaveBeenCalledWith(
      recordingId,
      runId,
      failure,
    );
  });
});
