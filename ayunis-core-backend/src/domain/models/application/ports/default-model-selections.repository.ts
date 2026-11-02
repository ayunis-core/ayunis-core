import type { UUID } from 'crypto';
import type {
  DefaultModelSelection,
  DefaultModelSelectionOwner,
} from 'src/domain/models/domain/default-model-selection';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';

/** One default per user, team or org; every write replaces that owner's row. */
export abstract class DefaultModelSelectionsRepository {
  abstract find(
    owner: DefaultModelSelectionOwner,
  ): Promise<DefaultModelSelection | null>;
  abstract findForTeams(teamIds: UUID[]): Promise<DefaultModelSelection[]>;
  abstract setModel(
    owner: DefaultModelSelectionOwner,
    permittedModelId: UUID,
  ): Promise<void>;
  abstract setMode(
    owner: DefaultModelSelectionOwner,
    mode: ModelMode,
  ): Promise<void>;
  abstract clear(owner: DefaultModelSelectionOwner): Promise<void>;
  abstract deleteByPermittedModelIds(permittedModelIds: UUID[]): Promise<void>;
  abstract deleteByCatalogModelId(catalogModelId: UUID): Promise<void>;
}
