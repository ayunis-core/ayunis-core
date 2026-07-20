import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { OrgMfaRequirementsRepository } from '../../ports/org-mfa-requirements.repository';
import { OrgMfaRequirement } from 'src/iam/mfa/domain/org-mfa-requirement.entity';
import { UnexpectedMfaError } from '../../mfa.errors';
import { GetOrgMfaRequirementQuery } from './get-org-mfa-requirement.query';

@Injectable()
export class GetOrgMfaRequirementUseCase {
  private readonly logger = new Logger(GetOrgMfaRequirementUseCase.name);

  constructor(
    private readonly orgMfaRequirementsRepository: OrgMfaRequirementsRepository,
  ) {}

  async execute(query: GetOrgMfaRequirementQuery): Promise<OrgMfaRequirement> {
    this.logger.log('getOrgMfaRequirement', { orgId: query.orgId });

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
      this.logger.error('Error getting org MFA requirement', {
        error: error as Error,
      });
      throw new UnexpectedMfaError(error);
    }
  }
}
