import { Injectable, Logger } from '@nestjs/common';
import { AdminTriggerPasswordResetCommand } from './admin-trigger-password-reset.command';
import { ContextService } from 'src/common/context/services/context.service';
import { UsersRepository } from '../../ports/users.repository';
import { TriggerPasswordResetUseCase } from '../trigger-password-reset/trigger-password-reset.use-case';
import { TriggerPasswordResetCommand } from '../trigger-password-reset/trigger-password-reset.command';
import { UserNotFoundError, UserUnauthorizedError } from '../../users.errors';

@Injectable()
export class AdminTriggerPasswordResetUseCase {
  private readonly logger = new Logger(AdminTriggerPasswordResetUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly usersRepository: UsersRepository,
    private readonly triggerPasswordResetUseCase: TriggerPasswordResetUseCase,
  ) {}

  async execute(command: AdminTriggerPasswordResetCommand): Promise<void> {
    this.logger.log('adminTriggerPasswordReset', { userId: command.userId });

    const requestUserOrgId = this.contextService.get('orgId');
    if (!requestUserOrgId) {
      throw new UserUnauthorizedError('User not authenticated');
    }

    // Find target user by ID
    const targetUser = await this.usersRepository.findOneById(command.userId);
    if (!targetUser) {
      this.logger.error('User not found', { userId: command.userId });
      throw new UserNotFoundError(command.userId);
    }

    // Validate target user belongs to same org
    if (targetUser.orgId !== requestUserOrgId) {
      throw new UserUnauthorizedError(
        'You are not allowed to trigger password reset for this user',
      );
    }

    // Delegate to existing TriggerPasswordResetUseCase
    await this.triggerPasswordResetUseCase.execute(
      new TriggerPasswordResetCommand(targetUser.email),
    );

    this.logger.log('Password reset triggered for user', {
      userId: command.userId,
      email: targetUser.email,
    });
  }
}
