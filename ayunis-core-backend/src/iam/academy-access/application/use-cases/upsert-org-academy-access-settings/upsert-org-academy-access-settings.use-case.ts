import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgAcademyAccessSettingsRepository } from '../../ports/org-academy-access-settings.repository';
import { OrgAcademyAccessSettings } from '../../../domain/org-academy-access-settings.entity';
import { UnexpectedAcademyAccessError } from '../../academy-access.errors';
import { UpsertOrgAcademyAccessSettingsCommand } from './upsert-org-academy-access-settings.command';

@Injectable()
export class UpsertOrgAcademyAccessSettingsUseCase {
  private readonly logger = new Logger(
    UpsertOrgAcademyAccessSettingsUseCase.name,
  );

  constructor(
    private readonly repository: OrgAcademyAccessSettingsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyAccessError)
  async execute(
    command: UpsertOrgAcademyAccessSettingsCommand,
  ): Promise<OrgAcademyAccessSettings> {
    this.logger.log('Upserting org academy access settings', {
      orgId: command.orgId,
      mode: command.mode,
    });

    const existing = await this.repository.findByOrgId(command.orgId);
    return this.repository.upsert(
      new OrgAcademyAccessSettings({
        id: existing?.id,
        orgId: command.orgId,
        mode: command.mode,
        createdAt: existing?.createdAt,
      }),
    );
  }
}
