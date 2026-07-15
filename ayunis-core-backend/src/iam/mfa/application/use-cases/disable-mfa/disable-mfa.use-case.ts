import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { UserTotpsRepository } from '../../ports/user-totps.repository';
import { MfaRecoveryCodesRepository } from '../../ports/mfa-recovery-codes.repository';
import { OrgMfaRequirementsRepository } from '../../ports/org-mfa-requirements.repository';
import { MfaRequiredByOrgError, UnexpectedMfaError } from '../../mfa.errors';
import { VerifyMfaCodeUseCase } from '../verify-mfa-code/verify-mfa-code.use-case';
import { VerifyMfaCodeCommand } from '../verify-mfa-code/verify-mfa-code.command';
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

  @HandleUnexpectedErrors(UnexpectedMfaError)
  async execute(command: DisableMfaCommand): Promise<void> {
    this.logger.log('disableMfa', { userId: command.userId });

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
  }
}
