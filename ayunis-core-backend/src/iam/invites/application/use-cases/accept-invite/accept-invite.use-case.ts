import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import {
  InviteJwtPayload,
  InviteJwtService,
} from '../../services/invite-jwt.service';
import { AcceptInviteCommand } from './accept-invite.command';
import {
  InviteNotFoundError,
  InviteExpiredError,
  InviteAlreadyAcceptedError,
  InvalidInviteTokenError,
  InviteRoleError,
  PasswordMismatchError,
  InvalidPasswordError,
} from '../../invites.errors';
import { CreateRegularUserUseCase } from 'src/iam/users/application/use-cases/create-regular-user/create-regular-user.use-case';
import { CreateAdminUserUseCase } from 'src/iam/users/application/use-cases/create-admin-user/create-admin-user.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { CreateAdminUserCommand } from 'src/iam/users/application/use-cases/create-admin-user/create-admin-user.command';
import { CreateRegularUserCommand } from 'src/iam/users/application/use-cases/create-regular-user/create-regular-user.command';
import { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { IsValidPasswordQuery } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.query';

@Injectable()
export class AcceptInviteUseCase {
  private readonly logger = new Logger(AcceptInviteUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly inviteJwtService: InviteJwtService,
    private readonly createRegularUserUseCase: CreateRegularUserUseCase,
    private readonly createAdminUserUseCase: CreateAdminUserUseCase,
    private readonly isValidPasswordUseCase: IsValidPasswordUseCase,
  ) {}

  async execute(
    command: AcceptInviteCommand,
  ): Promise<{ inviteId: string; email: string; orgId: string }> {
    this.logger.log('execute', { hasToken: !!command.inviteToken });

    // Verify and decode the JWT token
    let payload: InviteJwtPayload;
    try {
      payload = this.inviteJwtService.verifyInviteToken(command.inviteToken);
    } catch (error) {
      this.logger.error('Invalid invite token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InvalidInviteTokenError('Token verification failed');
    }

    // Find the invite in the database
    const invite = await this.invitesRepository.findOne(payload.inviteId);
    if (!invite) {
      this.logger.error('Invite not found', { inviteId: payload.inviteId });
      throw new InviteNotFoundError(payload.inviteId);
    }

    // Check if invite is already accepted
    if (invite.acceptedAt) {
      this.logger.error('Invite already accepted', { inviteId: invite.id });
      throw new InviteAlreadyAcceptedError({ inviteId: invite.id });
    }

    // Check if invite has expired
    if (invite.expiresAt < new Date()) {
      this.logger.error('Invite expired', {
        inviteId: invite.id,
        expiresAt: invite.expiresAt,
      });
      throw new InviteExpiredError({
        inviteId: invite.id,
        expiresAt: invite.expiresAt,
      });
    }
    if (command.password !== command.passwordConfirm) {
      throw new PasswordMismatchError();
    }

    if (
      !(await this.isValidPasswordUseCase.execute(
        new IsValidPasswordQuery(command.password),
      ))
    ) {
      throw new InvalidPasswordError();
    }

    if (invite.role === UserRole.ADMIN) {
      await this.createAdminUserUseCase.execute(
        new CreateAdminUserCommand({
          email: invite.email,
          password: command.password,
          orgId: invite.orgId,
          name: command.userName,
          emailVerified: true,
        }),
      );
    } else if (invite.role === UserRole.USER) {
      await this.createRegularUserUseCase.execute(
        new CreateRegularUserCommand({
          email: invite.email,
          orgId: invite.orgId,
          name: command.userName,
          password: command.password,
          emailVerified: true,
        }),
      );
    } else {
      throw new InviteRoleError(invite.role);
    }

    await this.invitesRepository.accept(invite.id);

    this.logger.debug('Invite accepted successfully', {
      inviteId: invite.id,
      email: invite.email,
    });

    return {
      inviteId: invite.id,
      email: invite.email,
      orgId: invite.orgId,
    };
  }
}
