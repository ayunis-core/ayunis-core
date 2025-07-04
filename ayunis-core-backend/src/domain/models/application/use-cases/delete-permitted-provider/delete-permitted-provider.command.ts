import { UUID } from 'crypto';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';

export class DeletePermittedProviderCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly permittedProvider: PermittedProvider,
  ) {}
}
