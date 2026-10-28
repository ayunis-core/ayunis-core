import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { OrgMfaRequirementsRepository } from 'src/iam/mfa/application/ports/org-mfa-requirements.repository';
import { OrgMfaRequirement } from 'src/iam/mfa/domain/org-mfa-requirement.entity';
import { UnexpectedMfaError } from 'src/iam/mfa/application/mfa.errors';
import { GetOrgMfaRequirementQuery } from './get-org-mfa-requirement.query';

@Injectable()
export class GetOrgMfaRequirementUseCase {
  private readonly logger = new Logger(GetOrgMfaRequirementUseCase.name);

  constructor(
    private readonly orgMfaRequirementsRepository: OrgMfaRequirementsRepository,
  ) {}

  async execute(query: GetOrgMfaRequirementQuery): Promise<OrgMfaRequirement> {
    this.logger.log({ orgId: query.orgId }, 'getOrgMfaRequirement');

    try {
      const requirement = await this.orgMfaRequirementsRepository.findByOrgId(
        query.orgId,
      );
      return (
        requirement ??
        new OrgMfaRequirement({ orgId: query.orgId, required: false })
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error getting org MFA requirement',
      );
      throw new UnexpectedMfaError(error);
    }
  }
}
