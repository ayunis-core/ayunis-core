import { RecordingSummaryFailure as Failure } from '@/shared/api/generated/ayunisCoreAPI.schemas';

type RecordingSummaryFailureReason =
  | 'noModel'
  | 'creditBudget'
  | 'creditLimit'
  | 'tooLong'
  | 'empty'
  | 'unavailable'
  | 'failed';

const REASONS: Record<Failure, RecordingSummaryFailureReason> = {
  [Failure.NO_SUMMARY_MODEL]: 'noModel',
  [Failure.CREDIT_BUDGET_EXCEEDED]: 'creditBudget',
  [Failure.CREDIT_LIMIT_EXCEEDED]: 'creditLimit',
  [Failure.TRANSCRIPT_TOO_LONG]: 'tooLong',
  [Failure.TRANSCRIPT_EMPTY]: 'empty',
  [Failure.PROVIDER_ERROR]: 'unavailable',
  [Failure.SUMMARY_FAILED]: 'failed',
};

/** Translation-key suffix under `detail.summary.failure` in `recordings`. */
export function getRecordingSummaryFailureReason(
  code?: Failure,
): RecordingSummaryFailureReason {
  return code && Object.hasOwn(REASONS, code) ? REASONS[code] : 'failed';
}
