import type { UUID } from 'crypto';
import type { PermittedLanguageModel } from './permitted-model.entity';
import type { ModelMode } from './value-objects/model-mode.enum';

export type DefaultModelSelectionOwner =
  { userId: UUID } | { teamId: UUID } | { orgId: UUID };

/** The default on one level: a concrete permitted model or a mode. */
export type DefaultModelSelection =
  | { kind: 'model'; permittedModel: PermittedLanguageModel }
  | { kind: 'mode'; mode: ModelMode };
