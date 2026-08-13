import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { InviteAlreadyAcceptedError } from 'src/iam/invites/application/invites.errors';
import { AcceptPendingInviteCommand } from 'src/iam/invites/application/use-cases/accept-pending-invite/accept-pending-invite.command';
import { AcceptPendingInviteUseCase } from 'src/iam/invites/application/use-cases/accept-pending-invite/accept-pending-invite.use-case';
import { FindPendingInviteByEmailAndOrgQuery } from 'src/iam/invites/application/use-cases/find-pending-invite-by-email-and-org/find-pending-invite-by-email-and-org.query';
import { FindPendingInviteByEmailAndOrgUseCase } from 'src/iam/invites/application/use-cases/find-pending-invite-by-email-and-org/find-pending-invite-by-email-and-org.use-case';
import { AssertSeatAvailableCommand } from 'src/iam/subscriptions/application/use-cases/assert-seat-available/assert-seat-available.command';
import { AssertSeatAvailableUseCase } from 'src/iam/subscriptions/application/use-cases/assert-seat-available/assert-seat-available.use-case';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { FederatedIdentitiesRepository } from 'src/iam/sso/application/ports/federated-identities.repository';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { SsoProvisioningLock } from 'src/iam/sso/application/ports/sso-provisioning-lock';
import {
  SsoAccountLinkRequiredError,
  SsoConnectionNotAvailableError,
  SsoInviteExpiredError,
  SsoOrganizationMismatchError,
  SsoJitProvisioningDisabledError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';
import { ProvisionOrgSsoUserCommand } from 'src/iam/sso/application/use-cases/provision-org-sso-user/provision-org-sso-user.command';
import { FederatedIdentity } from 'src/iam/sso/domain/federated-identity.entity';
import { CreateFederatedUserCommand } from 'src/iam/users/application/use-cases/create-federated-user/create-federated-user.command';
import { CreateFederatedUserUseCase } from 'src/iam/users/application/use-cases/create-federated-user/create-federated-user.use-case';
import { FindUserByEmailQuery } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.query';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { PublishUserCreatedEventUseCase } from 'src/iam/users/application/use-cases/publish-user-created-event/publish-user-created-event.use-case';
import type { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UserAlreadyExistsError } from 'src/iam/users/application/users.errors';
import type { Invite } from 'src/iam/invites/domain/invite.entity';
import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';
import { emailDomainFromAddress } from 'src/iam/sso/domain/sso-connection-values';

interface ProvisioningResult {
  user: User;
  created: boolean;
}

@Injectable()
export class ProvisionOrgSsoUserUseCase {
  private readonly logger = new Logger(ProvisionOrgSsoUserUseCase.name);

  constructor(
    private readonly connections: OrgSsoConnectionsRepository,
    private readonly identities: FederatedIdentitiesRepository,
    private readonly provisioningLock: SsoProvisioningLock,
    private readonly findUserById: FindUserByIdUseCase,
    private readonly findUserByEmail: FindUserByEmailUseCase,
    private readonly createFederatedUser: CreateFederatedUserUseCase,
    private readonly findInvite: FindPendingInviteByEmailAndOrgUseCase,
    private readonly acceptInvite: AcceptPendingInviteUseCase,
    private readonly assertSeatAvailable: AssertSeatAvailableUseCase,
    private readonly publishUserCreated: PublishUserCreatedEventUseCase,
    private readonly acquireAllocationLock: AcquireSeatAllocationLockUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(command: ProvisionOrgSsoUserCommand): Promise<User> {
    const result = await this.provision(command);
    if (result.created) {
      this.publishUserCreated.execute(result.user);
    }
    return result.user;
  }

  @Transactional()
  private async provision(
    command: ProvisionOrgSsoUserCommand,
  ): Promise<ProvisioningResult> {
    const { login } = command;
    const connection = await this.enabledConnection(command);
    await this.provisioningLock.acquireIdentity(login.issuer, login.subject);
    const mapped = this.existingResult(await this.findMappedUser(command));
    if (mapped) return mapped;
    await this.provisioningLock.acquireEmail(login.email);
    const mappingAfterLock = this.existingResult(
      await this.findMappedUser(command),
    );
    if (mappingAfterLock) return mappingAfterLock;
    await this.acquireAllocationLock.execute(login.orgId);
    await this.rejectExistingAccount(command);
    const invite = await this.admissionInvite(command, connection);
    await this.consumeInvite(invite);
    const user = await this.createUserAndIdentity(command, invite);
    this.logProvisionedUser(user, invite);
    return { user, created: true };
  }

  private async enabledConnection(
    command: ProvisionOrgSsoUserCommand,
  ): Promise<OrgSsoConnection> {
    const { login } = command;
    const connection = await this.connections.findByOrgId(login.orgId);
    if (!connection?.enabled) throw new SsoConnectionNotAvailableError();
    if (
      connection.zitadelOrgId !== login.zitadelOrgId ||
      emailDomainFromAddress(login.email) !== connection.emailDomain
    ) {
      throw new SsoOrganizationMismatchError();
    }
    return connection;
  }

  private existingResult(user: User | null): ProvisioningResult | null {
    return user ? { user, created: false } : null;
  }

  private async rejectExistingAccount(
    command: ProvisionOrgSsoUserCommand,
  ): Promise<void> {
    const { login } = command;
    const existingUser = await this.findUserByEmail.execute(
      new FindUserByEmailQuery(login.email),
    );
    if (!existingUser) return;
    if (existingUser.orgId !== login.orgId)
      throw new SsoOrganizationMismatchError();
    throw new SsoAccountLinkRequiredError();
  }

  private async admissionInvite(
    command: ProvisionOrgSsoUserCommand,
    connection: OrgSsoConnection,
  ): Promise<Invite | null> {
    const { login } = command;
    const invite = await this.findInvite.execute(
      new FindPendingInviteByEmailAndOrgQuery(login.email, login.orgId),
    );
    if (invite?.expiresAt && invite.expiresAt <= new Date()) {
      throw new SsoInviteExpiredError();
    }
    if (invite) return invite;
    if (!connection.jitProvisioningEnabled) {
      throw new SsoJitProvisioningDisabledError();
    }
    await this.assertSeatAvailable.execute(
      new AssertSeatAvailableCommand(login.orgId),
    );
    return null;
  }

  private async createUserAndIdentity(
    command: ProvisionOrgSsoUserCommand,
    invite: Invite | null,
  ): Promise<User> {
    const { login } = command;
    let user: User;
    try {
      user = await this.createFederatedUser.execute(
        new CreateFederatedUserCommand({
          email: login.email,
          name: login.name,
          orgId: login.orgId,
          role: invite?.role ?? UserRole.USER,
        }),
      );
    } catch (error: unknown) {
      if (error instanceof UserAlreadyExistsError) {
        throw new SsoAccountLinkRequiredError();
      }
      throw error;
    }
    await this.identities.create(
      new FederatedIdentity({
        issuer: login.issuer,
        subject: login.subject,
        userId: user.id,
      }),
    );
    return user;
  }

  private async consumeInvite(invite: Invite | null): Promise<void> {
    if (!invite) return;
    try {
      await this.acceptInvite.execute(
        new AcceptPendingInviteCommand(invite.id),
      );
    } catch (error: unknown) {
      if (error instanceof InviteAlreadyAcceptedError) {
        throw new SsoAccountLinkRequiredError();
      }
      throw error;
    }
  }

  private logProvisionedUser(user: User, invite: Invite | null): void {
    this.logger.log('Provisioned federated user', {
      userId: user.id,
      orgId: user.orgId,
      source: invite ? 'invite' : 'jit',
    });
  }

  private async findMappedUser(
    command: ProvisionOrgSsoUserCommand,
  ): Promise<User | null> {
    const { login } = command;
    const identity = await this.identities.findByIssuerAndSubject(
      login.issuer,
      login.subject,
    );
    if (!identity) {
      return null;
    }
    const user = await this.findUserById.execute(
      new FindUserByIdQuery(identity.userId),
    );
    if (user.orgId !== login.orgId) {
      throw new SsoOrganizationMismatchError();
    }
    return user;
  }
}
