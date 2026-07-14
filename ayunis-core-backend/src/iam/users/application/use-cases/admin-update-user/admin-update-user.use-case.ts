import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContextService } from 'src/common/context/services/context.service';
import { UsersRepository } from '../../ports/users.repository';
import { AdminUpdateUserCommand } from './admin-update-user.command';
import { User } from '../../../domain/user.entity';
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
  private readonly logger = new Logger(AdminUpdateUserUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly sendConfirmationEmailUseCase: SendConfirmationEmailUseCase,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: AdminUpdateUserCommand): Promise<User> {
    this.logger.log('adminUpdateUser', {
      userId: command.userId,
      hasName: command.name !== undefined,
      hasEmail: command.email !== undefined,
    });

    this.assertHasFieldsToUpdate(command);
    const requesterOrgId = this.readRequesterOrgId();

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
        'Failed to send confirmation email after admin update',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: user.id,
        },
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
        this.logger.error('Failed to emit UserUpdatedEvent', {
          error: err instanceof Error ? err.message : 'Unknown error',
          userId: user.id,
        });
      });
  }
}
