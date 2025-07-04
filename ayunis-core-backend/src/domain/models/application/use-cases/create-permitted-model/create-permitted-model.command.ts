import { UUID } from 'crypto';

export class CreatePermittedModelCommand {
  constructor(
    public readonly modelId: UUID,
    public readonly orgId: UUID,
  ) {}
}
