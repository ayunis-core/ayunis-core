import { UUID } from 'crypto';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';

export class CreatePermittedProviderCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly permittedProvider: PermittedProvider,
  ) {}
}
