import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserTotpsRepository } from '../../ports/user-totps.repository';
import { OrgMfaRequirementsRepository } from '../../ports/org-mfa-requirements.repository';
import { UnexpectedMfaError } from '../../mfa.errors';
import { CheckMfaLoginRequirementQuery } from './check-mfa-login-requirement.query';

export type MfaLoginRequirement = 'none' | 'verify' | 'enroll';

/**
 * Decides what the login flow must do after password verification:
 * - 'verify': the user has confirmed TOTP — require a code
 * - 'enroll': the org mandates MFA and the user is not enrolled — force
 *   enrollment before issuing a session
 * - 'none': proceed with the normal session
 */
@Injectable()
export class CheckMfaLoginRequirementUseCase {
  private readonly logger = new Logger(CheckMfaLoginRequirementUseCase.name);

  constructor(
    private readonly userTotpsRepository: UserTotpsRepository,
    private readonly orgMfaRequirementsRepository: OrgMfaRequirementsRepository,
  ) {}

  async execute(
    query: CheckMfaLoginRequirementQuery,
  ): Promise<MfaLoginRequirement> {
    this.logger.log('checkMfaLoginRequirement', { userId: query.userId });

    try {
      const totp = await this.userTotpsRepository.findByUserId(query.userId);
      if (totp?.isConfirmed()) {
        return 'verify';
      }

      const requirement = await this.orgMfaRequirementsRepository.findByOrgId(
        query.orgId,
      );
      return requirement?.required ? 'enroll' : 'none';
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error checking MFA login requirement', {
        error: error as Error,
      });
      throw new UnexpectedMfaError(error);
    }
  }
}
