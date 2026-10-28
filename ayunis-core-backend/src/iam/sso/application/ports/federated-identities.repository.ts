import type { FederatedIdentity } from 'src/iam/sso/domain/federated-identity.entity';

export class FederatedIdentityAlreadyExistsError extends Error {
  constructor() {
    super('Federated identity already exists');
    this.name = FederatedIdentityAlreadyExistsError.name;
  }
}

export abstract class FederatedIdentitiesRepository {
  abstract findByIssuerAndSubject(
    issuer: string,
    subject: string,
  ): Promise<FederatedIdentity | null>;
  abstract create(identity: FederatedIdentity): Promise<FederatedIdentity>;
}
