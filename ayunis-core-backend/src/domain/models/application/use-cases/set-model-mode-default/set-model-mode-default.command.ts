import type { UUID } from 'crypto';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import type { ModelModeDefaultLevel } from 'src/domain/models/domain/value-objects/model-mode-default-level.enum';

export class SetModelModeDefaultCommand {
  constructor(
    public readonly level: ModelModeDefaultLevel,
    /** `null` clears the mode default; the level's model default applies again. */
    public readonly mode: ModelMode | null,
    public readonly teamId?: UUID,
  ) {}
}
