import { UUID } from 'crypto';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';

export class CreatePermittedProviderCommand {
  userId: UUID;
  orgId: UUID;
  permittedProvider: PermittedProvider;

  constructor(params: {
    userId: UUID;
    orgId: UUID;
    permittedProvider: PermittedProvider;
  }) {
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.permittedProvider = params.permittedProvider;
  }
}
