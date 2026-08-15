import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgAcademyAccessSettingsRepository } from '../../ports/org-academy-access-settings.repository';
import { OrgAcademyAccessSettings } from '../../../domain/org-academy-access-settings.entity';
import { UnexpectedAcademyAccessError } from '../../academy-access.errors';
import { GetOrgAcademyAccessSettingsQuery } from './get-org-academy-access-settings.query';

/**
 * `orgId` is passed explicitly rather than read from `ContextService` because
 * the guard calls this before the CLS store is populated.
 */
@Injectable()
export class GetOrgAcademyAccessSettingsUseCase {
  constructor(
    @InjectPinoLogger(GetOrgAcademyAccessSettingsUseCase.name)
    private readonly logger: PinoLogger,
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
