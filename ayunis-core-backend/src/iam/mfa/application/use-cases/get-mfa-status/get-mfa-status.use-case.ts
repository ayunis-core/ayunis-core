import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserTotpsRepository } from '../../ports/user-totps.repository';
import { MfaRecoveryCodesRepository } from '../../ports/mfa-recovery-codes.repository';
import { UnexpectedMfaError } from '../../mfa.errors';
import { GetMfaStatusQuery } from './get-mfa-status.query';

export interface MfaStatus {
  enabled: boolean;
  confirmedAt: Date | null;
  recoveryCodesRemaining: number;
}

@Injectable()
export class GetMfaStatusUseCase {
  constructor(
    @InjectPinoLogger(GetMfaStatusUseCase.name)
    private readonly logger: PinoLogger,
    private readonly userTotpsRepository: UserTotpsRepository,
    private readonly recoveryCodesRepository: MfaRecoveryCodesRepository,
  ) {}

  async execute(query: GetMfaStatusQuery): Promise<MfaStatus> {
    this.logger.info({ userId: query.userId }, 'getMfaStatus');

    try {
      const totp = await this.userTotpsRepository.findByUserId(query.userId);
      if (!totp?.isConfirmed()) {
        return { enabled: false, confirmedAt: null, recoveryCodesRemaining: 0 };
      }

      const recoveryCodesRemaining =
        await this.recoveryCodesRepository.countUnusedByUserId(query.userId);

      return {
        enabled: true,
        confirmedAt: totp.confirmedAt,
        recoveryCodesRemaining,
      };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error({ err: error as Error }, 'Error getting MFA status');
      throw new UnexpectedMfaError(error);
    }
  }
}
