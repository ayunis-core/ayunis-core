import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import {
  UserNotFoundError,
  UserUnauthorizedError,
} from 'src/iam/users/application/users.errors';
import { UserTotpsRepository } from '../../ports/user-totps.repository';
import { MfaRecoveryCodesRepository } from '../../ports/mfa-recovery-codes.repository';
import {
  MfaSelfResetNotAllowedError,
  UnexpectedMfaError,
} from '../../mfa.errors';
import { ResetUserMfaCommand } from './reset-user-mfa.command';

/**
 * Admin lockout recovery: removes a user's TOTP enrollment and recovery
 * codes so they can sign in with their password and re-enroll.
 */
@Injectable()
export class ResetUserMfaUseCase {
  private readonly logger = new Logger(ResetUserMfaUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly userTotpsRepository: UserTotpsRepository,
    private readonly recoveryCodesRepository: MfaRecoveryCodesRepository,
  ) {}

  async execute(command: ResetUserMfaCommand): Promise<void> {
    this.logger.log('resetUserMfa', { targetUserId: command.targetUserId });

    const requesterId = this.contextService.get('userId');
    const requesterOrgId = this.contextService.get('orgId');
    if (!requesterId || !requesterOrgId) {
      throw new UserUnauthorizedError('User not authenticated');
    }

    try {
      if (command.targetUserId === requesterId) {
        throw new MfaSelfResetNotAllowedError();
      }

      const targetUser = await this.findUserByIdUseCase.execute(
        new FindUserByIdQuery(command.targetUserId),
      );

      // Cross-org resets must look like a missing user, not a permission gap.
      if (targetUser.orgId !== requesterOrgId) {
        throw new UserNotFoundError(command.targetUserId);
      }

      await this.recoveryCodesRepository.deleteByUserId(command.targetUserId);
      await this.userTotpsRepository.deleteByUserId(command.targetUserId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error resetting user MFA', { error: error as Error });
      throw new UnexpectedMfaError(error);
    }
  }
}
