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
  InvalidPasswordError,
  UserAlreadyExistsError,
} from '../../invites.errors';
import { CreateUserUseCase } from 'src/iam/users/application/use-cases/create-user/create-user.use-case';
import { CreateUserCommand } from 'src/iam/users/application/use-cases/create-user/create-user.command';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { IsValidPasswordQuery } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.query';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { FindUserByEmailQuery } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.query';
import { UnexpectedInviteError } from '../../invites.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class AcceptInviteUseCase {
  private readonly logger = new Logger(AcceptInviteUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly inviteJwtService: InviteJwtService,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly isValidPasswordUseCase: IsValidPasswordUseCase,
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedInviteError)
  async execute(
    command: AcceptInviteCommand,
  ): Promise<{ inviteId: string; email: string; orgId: string }> {
    this.logger.log('execute', { hasToken: !!command.inviteToken });

    const invite = await this.resolveValidatedInvite(command);

    await this.createUserUseCase.execute(
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

  private async resolveValidatedInvite(
    command: AcceptInviteCommand,
  ): Promise<Invite> {
    let payload: InviteJwtPayload;
    try {
      payload = this.inviteJwtService.verifyInviteToken(command.inviteToken);
    } catch (error) {
      this.logger.error('Invalid invite token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InvalidInviteTokenError('Token verification failed');
    }

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

    if (invite.acceptedAt) {
      this.logger.error('Invite already accepted', { inviteId: invite.id });
      throw new InviteAlreadyAcceptedError({ inviteId: invite.id });
    }

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

    return invite;
  }
}
