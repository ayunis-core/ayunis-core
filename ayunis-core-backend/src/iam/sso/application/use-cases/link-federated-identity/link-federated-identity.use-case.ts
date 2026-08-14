import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  FederatedIdentitiesRepository,
  FederatedIdentityAlreadyExistsError,
} from 'src/iam/sso/application/ports/federated-identities.repository';
import { SsoProvisioningLock } from 'src/iam/sso/application/ports/sso-provisioning-lock';
import {
  SsoAccountLinkConflictError,
  SsoAccountLinkMismatchError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { LinkFederatedIdentityCommand } from 'src/iam/sso/application/use-cases/link-federated-identity/link-federated-identity.command';
import { FederatedIdentity } from 'src/iam/sso/domain/federated-identity.entity';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';

@Injectable()
export class LinkFederatedIdentityUseCase {
  private readonly logger = new Logger(LinkFederatedIdentityUseCase.name);

  constructor(
    private readonly identities: FederatedIdentitiesRepository,
    private readonly provisioningLock: SsoProvisioningLock,
    private readonly findUserById: FindUserByIdUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(
    command: LinkFederatedIdentityCommand,
  ): Promise<FederatedIdentity> {
    this.logger.log('Linking federated identity', { userId: command.userId });
    return this.link(command);
  }

  @Transactional()
  private async link(
    command: LinkFederatedIdentityCommand,
  ): Promise<FederatedIdentity> {
    const { identity } = command;
    await this.provisioningLock.acquireIdentity(
      identity.issuer,
      identity.subject,
    );
    await this.provisioningLock.acquireEmail(identity.email);
    const user = await this.findUserById.execute(
      new FindUserByIdQuery(command.userId),
    );
    if (
      !identity.emailVerified ||
      user.orgId !== identity.orgId ||
      this.normalizeEmail(user.email) !== this.normalizeEmail(identity.email)
    ) {
      throw new SsoAccountLinkMismatchError();
    }
    const existing = await this.identities.findByIssuerAndSubject(
      identity.issuer,
      identity.subject,
    );
    if (existing) return this.assertOwner(existing, command.userId);
    return this.create(command);
  }

  private async create(
    command: LinkFederatedIdentityCommand,
  ): Promise<FederatedIdentity> {
    const { identity } = command;
    try {
      return await this.identities.create(
        new FederatedIdentity({
          issuer: identity.issuer,
          subject: identity.subject,
          userId: command.userId,
        }),
      );
    } catch (error: unknown) {
      if (!(error instanceof FederatedIdentityAlreadyExistsError)) throw error;
      const concurrent = await this.identities.findByIssuerAndSubject(
        identity.issuer,
        identity.subject,
      );
      if (!concurrent) throw error;
      return this.assertOwner(concurrent, command.userId);
    }
  }

  private assertOwner(
    identity: FederatedIdentity,
    userId: UUID,
  ): FederatedIdentity {
    if (identity.userId !== userId) throw new SsoAccountLinkConflictError();
    return identity;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
