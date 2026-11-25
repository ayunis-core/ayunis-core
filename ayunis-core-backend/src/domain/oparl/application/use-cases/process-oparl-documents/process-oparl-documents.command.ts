import type { UUID } from 'crypto';
import type { OparlDocumentsProgress } from 'src/domain/oparl/application/models/oparl-documents-progress';

export class ProcessOparlDocumentsCommand {
  constructor(
    readonly systemId: UUID,
    /** Where an earlier slice of the job stood; `null` to start. */
    readonly progress: OparlDocumentsProgress | null,
    readonly saveProgress: (progress: OparlDocumentsProgress) => Promise<void>,
    /** Aborted on shutdown; the job then throws `OparlSyncInterruptedError`. */
    readonly signal: AbortSignal,
  ) {}
}
