import type { UUID } from 'crypto';

export class SetUserDefaultLanguageModelCommand {
  constructor(
    public readonly userId: UUID,
    public readonly permittedModelId: UUID,
    public readonly orgId: UUID,
  ) {}
}
