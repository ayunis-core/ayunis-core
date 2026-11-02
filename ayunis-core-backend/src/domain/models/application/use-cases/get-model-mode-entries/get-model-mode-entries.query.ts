import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';

export class GetModelModeEntriesQuery {
  constructor(public readonly mode: ModelMode) {}
}
