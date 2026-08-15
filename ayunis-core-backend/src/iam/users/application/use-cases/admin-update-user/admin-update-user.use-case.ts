import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UsersRepository } from '../../ports/users.repository';
import { AdminUpdateUserCommand } from './admin-update-user.command';
import { User } from 'src/iam/users/domain/user.entity';
import {
  UserAlreadyExistsError,
  UserInvalidInputError,
  UserNotFoundError,
  UserUnauthorizedError,
  UserUnexpectedError,
} from '../../users.errors';
import { UserUpdatedEvent } from '../../events/user-updated.event';
import { SendConfirmationEmailUseCase } from '../send-confirmation-email/send-confirmation-email.use-case';
import { SendConfirmationEmailCommand } from '../send-confirmation-email/send-confirmation-email.command';

@Injectable()
export class AdminUpdateUserUseCase {
  constructor(
    @InjectPinoLogger(AdminUpdateUserUseCase.name)
    private readonly logger: PinoLogger,
    private readonly contextService: ContextService,
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly sendConfirmationEmailUseCase: SendConfirmationEmailUseCase,
  ) {}

  async execute(command: AdminUpdateUserCommand): Promise<User> {
    this.logger.info(
      {
        userId: command.userId,
        hasName: command.name !== undefined,
        hasEmail: command.email !== undefined,
      },
      'adminUpdateUser',
    );

    this.assertHasFieldsToUpdate(command);
    const requesterOrgId = this.readRequesterOrgId();

    try {
      const targetUser = await this.loadTargetUser(
        command.userId,
        requesterOrgId,
      );

      const emailChanged = await this.applyChanges(targetUser, command);

      const updatedUser = await this.usersRepository.update(targetUser);
      this.emitUserUpdated(updatedUser);
      if (emailChanged) {
        await this.sendConfirmationEmail(updatedUser);
      }
      return updatedUser;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: command.userId,
        },
        'Failed to update user',
      );
      throw new UserUnexpectedError(error as Error);
    }
  }

  private assertHasFieldsToUpdate(command: AdminUpdateUserCommand): void {
    if (command.name === undefined && command.email === undefined) {
      throw new UserInvalidInputError(
        'At least one of name or email must be provided',
      );
    }
  }

  private readRequesterOrgId(): string {
    const requesterOrgId = this.contextService.get('orgId');
    if (!requesterOrgId) {
      throw new UserUnauthorizedError('User not authenticated');
    }
    return requesterOrgId;
  }

  private async loadTargetUser(
    userId: AdminUpdateUserCommand['userId'],
    requesterOrgId: string,
  ): Promise<User> {
    const targetUser = await this.usersRepository.findOneById(userId);
    if (!targetUser) {
      throw new UserNotFoundError(userId);
    }
    if (targetUser.orgId !== requesterOrgId) {
      throw new UserUnauthorizedError(
        'You are not allowed to update this user',
      );
    }
    return targetUser;
  }

  private async applyChanges(
    user: User,
    command: AdminUpdateUserCommand,
  ): Promise<boolean> {
    let emailChanged = false;
    if (command.email !== undefined && command.email !== user.email) {
      await this.assertEmailAvailable(command.email, user.id);
      user.email = command.email;
      user.emailVerified = false;
      emailChanged = true;
    }
    if (command.name !== undefined) {
      user.name = command.name;
    }
    return emailChanged;
  }

  private async assertEmailAvailable(
    email: string,
    currentUserId: User['id'],
  ): Promise<void> {
    const existing = await this.usersRepository.findOneByEmail(email);
    if (existing && existing.id !== currentUserId) {
      throw new UserAlreadyExistsError(email);
    }
  }

  private async sendConfirmationEmail(user: User): Promise<void> {
    try {
      await this.sendConfirmationEmailUseCase.execute(
        new SendConfirmationEmailCommand(user),
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: user.id,
        },
        'Failed to send confirmation email after admin update',
      );
    }
  }

  private emitUserUpdated(user: User): void {
    this.eventEmitter
      .emitAsync(
        UserUpdatedEvent.EVENT_NAME,
        new UserUpdatedEvent(user.id, user.orgId, user),
      )
      .catch((err: unknown) => {
        this.logger.error(
          {
            error: err instanceof Error ? err.message : 'Unknown error',
            userId: user.id,
          },
          'Failed to emit UserUpdatedEvent',
        );
      });
  }
}
