import { Transactional } from '@nestjs-cls/transactional';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  InviteAlreadyAcceptedError,
  InviteExpiredError,
  InviteNotFoundError,
  InvalidInviteTokenError,
  InvalidPasswordError,
  UnexpectedInviteError,
  UserAlreadyExistsError,
} from 'src/iam/invites/application/invites.errors';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import {
  InviteJwtService,
  type InviteJwtPayload,
} from 'src/iam/invites/application/services/invite-jwt.service';
import { AcceptInviteCommand } from 'src/iam/invites/application/use-cases/accept-invite/accept-invite.command';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { UserCreatedEventPublisher } from 'src/iam/users/application/services/user-created-event-publisher.service';
import { CreateUserCommand } from 'src/iam/users/application/use-cases/create-user/create-user.command';
import { CreateUserUseCase } from 'src/iam/users/application/use-cases/create-user/create-user.use-case';
import { FindUserByEmailQuery } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.query';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { IsValidPasswordQuery } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.query';
import { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class AcceptInviteUseCase {
  private readonly logger = new Logger(AcceptInviteUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly inviteJwtService: InviteJwtService,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly isValidPasswordUseCase: IsValidPasswordUseCase,
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly publishUserCreated: UserCreatedEventPublisher,
    private readonly acquireAllocationLock: AcquireSeatAllocationLockUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedInviteError)
  async execute(
    command: AcceptInviteCommand,
  ): Promise<{ inviteId: string; email: string; orgId: string }> {
    this.logger.log({ hasToken: !!command.inviteToken }, 'execute');

    const invite = await this.resolveValidatedInvite(command);
    const preparedUser = await this.createUserUseCase.prepare(
      new CreateUserCommand({
        email: invite.email,
        password: command.password,
        orgId: invite.orgId,
        name: command.userName,
        role: invite.role,
        emailVerified: true,
        hasAcceptedMarketing: command.hasAcceptedMarketing,
        department: command.department,
      }),
    );

    const user = await this.acceptAndCreateUser(invite, preparedUser);
    this.publishUserCreated.publish(user);
    this.logger.debug(
      { inviteId: invite.id, email: invite.email },
      'Invite accepted successfully',
    );

    return {
      inviteId: invite.id,
      email: invite.email,
      orgId: invite.orgId,
    };
  }

  @Transactional()
  private async acceptAndCreateUser(
    invite: Invite,
    preparedUser: User,
  ): Promise<User> {
    await this.acquireAllocationLock.execute(invite.orgId);
    this.rejectExpiredInvite(invite);
    await this.rejectExistingUser(invite.email);
    if (!(await this.invitesRepository.accept(invite.id))) {
      throw new InviteAlreadyAcceptedError({ inviteId: invite.id });
    }
    return this.createUserUseCase.createPreparedWithoutPublishing(preparedUser);
  }

  private async resolveValidatedInvite(
    command: AcceptInviteCommand,
  ): Promise<Invite> {
    let payload: InviteJwtPayload;
    try {
      payload = this.inviteJwtService.verifyInviteToken(command.inviteToken);
    } catch (error) {
      this.logger.error({ err: error as Error }, 'Invalid invite token');
      throw new InvalidInviteTokenError('Token verification failed');
    }

    const invite = await this.invitesRepository.findOne(payload.inviteId);
    if (!invite) {
      this.logger.error({ inviteId: payload.inviteId }, 'Invite not found');
      throw new InviteNotFoundError(payload.inviteId);
    }

    await this.rejectExistingUser(invite.email);
    if (invite.acceptedAt) {
      this.logger.error({ inviteId: invite.id }, 'Invite already accepted');
      throw new InviteAlreadyAcceptedError({ inviteId: invite.id });
    }
    this.rejectExpiredInvite(invite);

    if (
      !(await this.isValidPasswordUseCase.execute(
        new IsValidPasswordQuery(command.password),
      ))
    ) {
      throw new InvalidPasswordError();
    }
    return invite;
  }

  private async rejectExistingUser(email: string): Promise<void> {
    const existingUser = await this.findUserByEmailUseCase.execute(
      new FindUserByEmailQuery(email),
    );
    if (existingUser) throw new UserAlreadyExistsError();
  }

  private rejectExpiredInvite(invite: Invite): void {
    if (invite.expiresAt >= new Date()) return;
    this.logger.error(
      { inviteId: invite.id, expiresAt: invite.expiresAt },
      'Invite expired',
    );
    throw new InviteExpiredError({
      inviteId: invite.id,
      expiresAt: invite.expiresAt,
    });
  }
}
