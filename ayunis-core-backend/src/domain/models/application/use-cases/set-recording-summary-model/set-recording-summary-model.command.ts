import type { UUID } from 'crypto';

export class SetRecordingSummaryModelCommand {
  /** Null clears the setting, so summaries use the org default model. */
  constructor(public readonly permittedModelId: UUID | null) {}
}
