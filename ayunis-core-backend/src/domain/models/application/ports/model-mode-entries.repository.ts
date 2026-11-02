import type { ModelModeEntry } from 'src/domain/models/domain/model-mode-entry.entity';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';

export abstract class ModelModeEntriesRepository {
  /** Entries ordered by position, highest preference first. */
  abstract findByMode(mode: ModelMode): Promise<ModelModeEntry[]>;
  abstract replaceForMode(
    mode: ModelMode,
    entries: ModelModeEntry[],
  ): Promise<void>;
}
