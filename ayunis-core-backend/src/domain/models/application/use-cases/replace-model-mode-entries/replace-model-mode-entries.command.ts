import type { UUID } from 'crypto';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';

export class ReplaceModelModeEntriesCommand {
  constructor(
    public readonly mode: ModelMode,
    /** Ordered by preference, highest first. */
    public readonly entries: ReadonlyArray<{ modelId: UUID; enabled: boolean }>,
  ) {}
}
