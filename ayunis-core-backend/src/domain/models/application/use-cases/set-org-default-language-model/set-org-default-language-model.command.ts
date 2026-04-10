import type { UUID } from 'crypto';

export class SetOrgDefaultLanguageModelCommand {
  constructor(
    public readonly permittedModelId: UUID,
    public readonly orgId: UUID,
  ) {}
}
