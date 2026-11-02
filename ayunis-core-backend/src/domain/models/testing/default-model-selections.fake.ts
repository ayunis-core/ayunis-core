import type { UUID } from 'crypto';
import type { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import type {
  DefaultModelSelection,
  DefaultModelSelectionOwner,
} from 'src/domain/models/domain/default-model-selection';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';

const keyOf = (owner: DefaultModelSelectionOwner) =>
  Object.entries(owner)[0].join(':');

/**
 * In-memory DefaultModelSelectionsRepository for use-case specs. Reads come
 * from rows seeded with `store`; every method is a jest mock for assertions.
 */
export function createDefaultModelSelectionsFake() {
  const rows = new Map<string, DefaultModelSelection>();
  const repo = {
    find: jest.fn((owner: DefaultModelSelectionOwner) =>
      Promise.resolve(rows.get(keyOf(owner)) ?? null),
    ),
    findForTeams: jest.fn((teamIds: UUID[]) =>
      Promise.resolve(
        teamIds.flatMap((teamId) => rows.get(`teamId:${teamId}`) ?? []),
      ),
    ),
    setModel: jest.fn(),
    setMode: jest.fn(),
    clear: jest.fn(),
    deleteByPermittedModelIds: jest.fn(),
    deleteByCatalogModelId: jest.fn(),
  } satisfies Record<keyof DefaultModelSelectionsRepository, jest.Mock>;

  /** `null` removes the owner's default. */
  const store = (
    owner: DefaultModelSelectionOwner,
    value: PermittedLanguageModel | ModelMode | null,
  ) => {
    if (value === null) rows.delete(keyOf(owner));
    else if (typeof value === 'string') {
      rows.set(keyOf(owner), { kind: 'mode', mode: value });
    } else {
      rows.set(keyOf(owner), { kind: 'model', permittedModel: value });
    }
  };

  /** Team defaults keyed by each permit's own team (scopeId). */
  const storeTeamModels = (permits: PermittedLanguageModel[]) => {
    for (const permit of permits) {
      if (permit.scopeId) store({ teamId: permit.scopeId }, permit);
    }
  };

  return { repo, store, storeTeamModels };
}
