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
  InvalidPasswordError,
  UserAlreadyExistsError,
} from '../../invites.errors';
import { CreateRegularUserUseCase } from 'src/iam/users/application/use-cases/create-regular-user/create-regular-user.use-case';
import { CreateAdminUserUseCase } from 'src/iam/users/application/use-cases/create-admin-user/create-admin-user.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { CreateAdminUserCommand } from 'src/iam/users/application/use-cases/create-admin-user/create-admin-user.command';
import { CreateRegularUserCommand } from 'src/iam/users/application/use-cases/create-regular-user/create-regular-user.command';
import { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { IsValidPasswordQuery } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.query';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { FindUserByEmailQuery } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.query';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedInviteError } from '../../invites.errors';

@Injectable()
export class AcceptInviteUseCase {
  private readonly logger = new Logger(AcceptInviteUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly inviteJwtService: InviteJwtService,
    private readonly createRegularUserUseCase: CreateRegularUserUseCase,
    private readonly createAdminUserUseCase: CreateAdminUserUseCase,
    private readonly isValidPasswordUseCase: IsValidPasswordUseCase,
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
  ) {}

  async execute(
    command: AcceptInviteCommand,
  ): Promise<{ inviteId: string; email: string; orgId: string }> {
    this.logger.log('execute', { hasToken: !!command.inviteToken });
    try {
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

      const existingUser = await this.findUserByEmailUseCase.execute(
        new FindUserByEmailQuery(invite.email),
      );
      if (existingUser) {
        throw new UserAlreadyExistsError();
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
            hasAcceptedMarketing: command.hasAcceptedMarketing,
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
            hasAcceptedMarketing: command.hasAcceptedMarketing,
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
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Accept invite failed', { error });
      throw new UnexpectedInviteError(error);
    }
  }
}
