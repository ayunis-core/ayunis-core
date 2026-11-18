import { ProviderUnavailableError } from 'src/common/errors/provider.errors';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { NoRecordingSummaryModelError } from 'src/domain/models/application/recording-summary-model.errors';
import {
  RecordingTranscriptEmptyError,
  RecordingTranscriptTooLongError,
} from 'src/domain/recordings/application/recordings.errors';
import { RecordingSummaryFailure } from 'src/domain/recordings/domain/recording-summary-failure.enum';
import {
  TeamCreditLimitExceededError,
  UserCreditLimitExceededError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';

const FAILURES: [
  abstract new (...args: never[]) => Error,
  RecordingSummaryFailure,
][] = [
  [NoRecordingSummaryModelError, RecordingSummaryFailure.NO_SUMMARY_MODEL],
  [CreditBudgetExceededError, RecordingSummaryFailure.CREDIT_BUDGET_EXCEEDED],
  [UserCreditLimitExceededError, RecordingSummaryFailure.CREDIT_LIMIT_EXCEEDED],
  [TeamCreditLimitExceededError, RecordingSummaryFailure.CREDIT_LIMIT_EXCEEDED],
  [
    RecordingTranscriptTooLongError,
    RecordingSummaryFailure.TRANSCRIPT_TOO_LONG,
  ],
  [RecordingTranscriptEmptyError, RecordingSummaryFailure.TRANSCRIPT_EMPTY],
  [ProviderUnavailableError, RecordingSummaryFailure.PROVIDER_ERROR],
  [InferenceFailedError, RecordingSummaryFailure.PROVIDER_ERROR],
];

/** The reason shown for a summary run that ended with `error`. */
export function recordingSummaryFailureOf(
  error: unknown,
): RecordingSummaryFailure {
  return (
    FAILURES.find(([type]) => error instanceof type)?.[1] ??
    RecordingSummaryFailure.SUMMARY_FAILED
  );
}
