/** Why a recording's summary could not be generated. */
export enum RecordingSummaryFailure {
  /** The org has no language model that may summarize recordings. */
  NO_SUMMARY_MODEL = 'NO_SUMMARY_MODEL',
  /** The org's monthly credit budget is used up. */
  CREDIT_BUDGET_EXCEEDED = 'CREDIT_BUDGET_EXCEEDED',
  /** The billed user's personal or team credit limit is reached. */
  CREDIT_LIMIT_EXCEEDED = 'CREDIT_LIMIT_EXCEEDED',
  /** The transcript does not fit into the model's context window. */
  TRANSCRIPT_TOO_LONG = 'TRANSCRIPT_TOO_LONG',
  /** The transcript has no speech to summarize. */
  TRANSCRIPT_EMPTY = 'TRANSCRIPT_EMPTY',
  /** The model provider kept failing after the retries. */
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  SUMMARY_FAILED = 'SUMMARY_FAILED',
}
