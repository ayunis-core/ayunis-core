import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { OrgMfaRequirementsRepository } from '../../ports/org-mfa-requirements.repository';
import { OrgMfaRequirement } from '../../../domain/org-mfa-requirement.entity';
import { UnexpectedMfaError } from '../../mfa.errors';
import { UpsertOrgMfaRequirementCommand } from './upsert-org-mfa-requirement.command';

@Injectable()
export class UpsertOrgMfaRequirementUseCase {
  private readonly logger = new Logger(UpsertOrgMfaRequirementUseCase.name);

  constructor(
    private readonly orgMfaRequirementsRepository: OrgMfaRequirementsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedMfaError)
  async execute(
    command: UpsertOrgMfaRequirementCommand,
  ): Promise<OrgMfaRequirement> {
    this.logger.log('upsertOrgMfaRequirement', {
      orgId: command.orgId,
      required: command.required,
    });

    const existing = await this.orgMfaRequirementsRepository.findByOrgId(
      command.orgId,
    );

    return await this.orgMfaRequirementsRepository.upsert(
      new OrgMfaRequirement({
        id: existing?.id,
        orgId: command.orgId,
        required: command.required,
        createdAt: existing?.createdAt,
      }),
    );
  }
}
