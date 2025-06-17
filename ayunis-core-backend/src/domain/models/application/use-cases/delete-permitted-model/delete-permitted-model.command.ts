import { UUID } from 'crypto';

export class DeletePermittedModelCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly modelId: UUID,
  ) {}
}
