import { Injectable, Logger } from '@nestjs/common';
import { AdminTriggerPasswordResetCommand } from './admin-trigger-password-reset.command';
import { ContextService } from 'src/common/context/services/context.service';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { TriggerPasswordResetUseCase } from 'src/iam/users/application/use-cases/trigger-password-reset/trigger-password-reset.use-case';
import { TriggerPasswordResetCommand } from 'src/iam/users/application/use-cases/trigger-password-reset/trigger-password-reset.command';
import {
  UserInvalidInputError,
  UserNotFoundError,
  UserUnauthorizedError,
} from 'src/iam/users/application/users.errors';

@Injectable()
export class AdminTriggerPasswordResetUseCase {
  private readonly logger = new Logger(AdminTriggerPasswordResetUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly usersRepository: UsersRepository,
    private readonly triggerPasswordResetUseCase: TriggerPasswordResetUseCase,
  ) {}

  async execute(command: AdminTriggerPasswordResetCommand): Promise<void> {
    this.logger.log({ userId: command.userId }, 'adminTriggerPasswordReset');

    const requestUserOrgId = this.contextService.get('orgId');
    if (!requestUserOrgId) {
      throw new UserUnauthorizedError('User not authenticated');
    }

    const targetUser = await this.usersRepository.findOneById(command.userId);
    if (!targetUser) {
      this.logger.error({ userId: command.userId }, 'User not found');
      throw new UserNotFoundError(command.userId);
    }

    if (targetUser.orgId !== requestUserOrgId) {
      throw new UserUnauthorizedError(
        'You are not allowed to trigger password reset for this user',
      );
    }
    if (targetUser.passwordHash === null) {
      throw new UserInvalidInputError(
        'Password reset is unavailable for users without a local password',
      );
    }

    await this.triggerPasswordResetUseCase.execute(
      new TriggerPasswordResetCommand(targetUser.email),
    );

    this.logger.log(
      {
        userId: command.userId,
        email: targetUser.email,
      },
      'Password reset triggered for user',
    );
  }
}
