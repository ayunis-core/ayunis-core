import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { OrgMfaRequirementsRepository } from '../../ports/org-mfa-requirements.repository';
import { OrgMfaRequirement } from 'src/iam/mfa/domain/org-mfa-requirement.entity';
import { UnexpectedMfaError } from '../../mfa.errors';
import { UpsertOrgMfaRequirementCommand } from './upsert-org-mfa-requirement.command';

@Injectable()
export class UpsertOrgMfaRequirementUseCase {
  private readonly logger = new Logger(UpsertOrgMfaRequirementUseCase.name);

  constructor(
    private readonly orgMfaRequirementsRepository: OrgMfaRequirementsRepository,
  ) {}

  async execute(
    command: UpsertOrgMfaRequirementCommand,
  ): Promise<OrgMfaRequirement> {
    this.logger.log('upsertOrgMfaRequirement', {
      orgId: command.orgId,
      required: command.required,
    });

    try {
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
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error upserting org MFA requirement', {
        error: error as Error,
      });
      throw new UnexpectedMfaError(error);
    }
  }
}
