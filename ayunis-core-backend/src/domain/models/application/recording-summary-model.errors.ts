import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';

export enum RecordingSummaryModelErrorCode {
  RECORDING_SUMMARY_MODEL_ANONYMOUS_ONLY = 'RECORDING_SUMMARY_MODEL_ANONYMOUS_ONLY',
  NO_RECORDING_SUMMARY_MODEL = 'NO_RECORDING_SUMMARY_MODEL',
}

/** Transcripts are not anonymized, so an anonymous-only model must not receive them. */
export class AnonymousOnlySummaryModelError extends ApplicationError {
  constructor(permittedModelId: UUID) {
    super(
      `Permitted model '${permittedModelId}' may only receive anonymized input`,
      RecordingSummaryModelErrorCode.RECORDING_SUMMARY_MODEL_ANONYMOUS_ONLY,
      400,
    );
  }
}

export class NoRecordingSummaryModelError extends ApplicationError {
  constructor(orgId: UUID) {
    super(
      `No language model can summarize recordings for org '${orgId}'`,
      RecordingSummaryModelErrorCode.NO_RECORDING_SUMMARY_MODEL,
      422,
    );
  }
}
