import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(GetMfaStatusUseCase.name);

  constructor(
    private readonly userTotpsRepository: UserTotpsRepository,
    private readonly recoveryCodesRepository: MfaRecoveryCodesRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMfaError)
  async execute(query: GetMfaStatusQuery): Promise<MfaStatus> {
    this.logger.log('getMfaStatus', { userId: query.userId });

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
  }
}
