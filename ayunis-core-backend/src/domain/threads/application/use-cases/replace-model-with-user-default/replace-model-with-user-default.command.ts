import { UUID } from 'crypto';

export class ReplaceModelWithUserDefaultCommand {
  constructor(public readonly oldPermittedModelId: UUID) {}
}
