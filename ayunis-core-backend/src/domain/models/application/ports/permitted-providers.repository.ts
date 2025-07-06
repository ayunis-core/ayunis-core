import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';
import { UUID } from 'crypto';

export abstract class PermittedProvidersRepository {
  abstract create(
    orgId: UUID,
    permittedProvider: PermittedProvider,
  ): Promise<PermittedProvider>;
  abstract delete(
    orgId: UUID,
    permittedProvider: PermittedProvider,
  ): Promise<void>;
  abstract findAll(orgId: UUID): Promise<PermittedProvider[]>;
}
