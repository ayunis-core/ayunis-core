import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { OrgMfaRequirementsRepository } from '../../ports/org-mfa-requirements.repository';
import { OrgMfaRequirement } from '../../../domain/org-mfa-requirement.entity';
import { UnexpectedMfaError } from '../../mfa.errors';
import { GetOrgMfaRequirementQuery } from './get-org-mfa-requirement.query';

@Injectable()
export class GetOrgMfaRequirementUseCase {
  private readonly logger = new Logger(GetOrgMfaRequirementUseCase.name);

  constructor(
    private readonly orgMfaRequirementsRepository: OrgMfaRequirementsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMfaError)
  async execute(query: GetOrgMfaRequirementQuery): Promise<OrgMfaRequirement> {
    this.logger.log('getOrgMfaRequirement', { orgId: query.orgId });

    const requirement = await this.orgMfaRequirementsRepository.findByOrgId(
      query.orgId,
    );
    return (
      requirement ??
      new OrgMfaRequirement({ orgId: query.orgId, required: false })
    );
  }
}
