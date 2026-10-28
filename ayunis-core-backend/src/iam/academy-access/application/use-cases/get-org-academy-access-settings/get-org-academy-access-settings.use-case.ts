import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgAcademyAccessSettingsRepository } from 'src/iam/academy-access/application/ports/org-academy-access-settings.repository';
import { OrgAcademyAccessSettings } from 'src/iam/academy-access/domain/org-academy-access-settings.entity';
import { UnexpectedAcademyAccessError } from 'src/iam/academy-access/application/academy-access.errors';
import { GetOrgAcademyAccessSettingsQuery } from './get-org-academy-access-settings.query';

/**
 * `orgId` is passed explicitly rather than read from `ContextService` because
 * the guard calls this before the CLS store is populated.
 */
@Injectable()
export class GetOrgAcademyAccessSettingsUseCase {
  private readonly logger = new Logger(GetOrgAcademyAccessSettingsUseCase.name);

  constructor(
    private readonly repository: OrgAcademyAccessSettingsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyAccessError)
  async execute(
    query: GetOrgAcademyAccessSettingsQuery,
  ): Promise<OrgAcademyAccessSettings> {
    this.logger.debug(
      {
        orgId: query.orgId,
      },
      'Getting org academy access settings',
    );

    const settings = await this.repository.findByOrgId(query.orgId);
    return settings ?? new OrgAcademyAccessSettings({ orgId: query.orgId });
  }
}
