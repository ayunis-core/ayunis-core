import type { UUID } from 'crypto';
import type { FederatedIdentity } from 'src/iam/sso/domain/federated-identity.entity';

export class FederatedIdentityAlreadyExistsError extends Error {
  constructor() {
    super('Federated identity already exists');
    this.name = FederatedIdentityAlreadyExistsError.name;
  }
}

export abstract class FederatedIdentitiesRepository {
  abstract existsByUserIdAndIssuer(
    userId: UUID,
    issuer: string,
  ): Promise<boolean>;
  abstract findByIssuerAndSubject(
    issuer: string,
    subject: string,
  ): Promise<FederatedIdentity | null>;
  abstract findSubjectsByUserId(
    userId: UUID,
    issuer: string,
  ): Promise<string[]>;
  abstract findSubjectsByOrgId(orgId: UUID, issuer: string): Promise<string[]>;
  abstract findLinkedSubjects(
    issuer: string,
    subjects: string[],
  ): Promise<string[]>;
  abstract create(identity: FederatedIdentity): Promise<FederatedIdentity>;
}
