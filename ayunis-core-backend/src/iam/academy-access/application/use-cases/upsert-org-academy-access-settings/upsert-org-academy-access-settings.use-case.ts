import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgAcademyAccessSettingsRepository } from 'src/iam/academy-access/application/ports/org-academy-access-settings.repository';
import { OrgAcademyAccessSettings } from 'src/iam/academy-access/domain/org-academy-access-settings.entity';
import { UnexpectedAcademyAccessError } from 'src/iam/academy-access/application/academy-access.errors';
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
    this.logger.log(
      {
        orgId: command.orgId,
        mode: command.mode,
      },
      'Upserting org academy access settings',
    );

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
