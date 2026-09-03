import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserTotpsRepository } from 'src/iam/mfa/application/ports/user-totps.repository';
import { MfaRecoveryCodesRepository } from 'src/iam/mfa/application/ports/mfa-recovery-codes.repository';
import { OrgMfaRequirementsRepository } from 'src/iam/mfa/application/ports/org-mfa-requirements.repository';
import {
  MfaRequiredByOrgError,
  UnexpectedMfaError,
} from 'src/iam/mfa/application/mfa.errors';
import { VerifyMfaCodeUseCase } from 'src/iam/mfa/application/use-cases/verify-mfa-code/verify-mfa-code.use-case';
import { VerifyMfaCodeCommand } from 'src/iam/mfa/application/use-cases/verify-mfa-code/verify-mfa-code.command';
import { DisableMfaCommand } from './disable-mfa.command';

@Injectable()
export class DisableMfaUseCase {
  private readonly logger = new Logger(DisableMfaUseCase.name);

  constructor(
    private readonly userTotpsRepository: UserTotpsRepository,
    private readonly recoveryCodesRepository: MfaRecoveryCodesRepository,
    private readonly orgMfaRequirementsRepository: OrgMfaRequirementsRepository,
    private readonly verifyMfaCodeUseCase: VerifyMfaCodeUseCase,
  ) {}

  async execute(command: DisableMfaCommand): Promise<void> {
    this.logger.log({ userId: command.userId }, 'disableMfa');

    try {
      // Checked before code verification so no recovery code is consumed on
      // an attempt that is forbidden anyway.
      const requirement = await this.orgMfaRequirementsRepository.findByOrgId(
        command.orgId,
      );
      if (requirement?.required) {
        throw new MfaRequiredByOrgError();
      }

      await this.verifyMfaCodeUseCase.execute(
        new VerifyMfaCodeCommand(command.userId, command.code),
      );

      await this.recoveryCodesRepository.deleteByUserId(command.userId);
      await this.userTotpsRepository.deleteByUserId(command.userId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error({ err: error as Error }, 'Error disabling MFA');
      throw new UnexpectedMfaError(error);
    }
  }
}
