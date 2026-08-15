import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { OrgMfaRequirementsRepository } from '../../ports/org-mfa-requirements.repository';
import { OrgMfaRequirement } from 'src/iam/mfa/domain/org-mfa-requirement.entity';
import { UnexpectedMfaError } from '../../mfa.errors';
import { UpsertOrgMfaRequirementCommand } from './upsert-org-mfa-requirement.command';

@Injectable()
export class UpsertOrgMfaRequirementUseCase {
  constructor(
    @InjectPinoLogger(UpsertOrgMfaRequirementUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgMfaRequirementsRepository: OrgMfaRequirementsRepository,
  ) {}

  async execute(
    command: UpsertOrgMfaRequirementCommand,
  ): Promise<OrgMfaRequirement> {
    this.logger.info(
      {
        orgId: command.orgId,
        required: command.required,
      },
      'upsertOrgMfaRequirement',
    );

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error upserting org MFA requirement',
      );
      throw new UnexpectedMfaError(error);
    }
  }
}
