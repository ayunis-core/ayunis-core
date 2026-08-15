import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OrgAcademyAccessSettingsRepository } from '../../ports/org-academy-access-settings.repository';
import { OrgAcademyAccessSettings } from '../../../domain/org-academy-access-settings.entity';
import { UnexpectedAcademyAccessError } from '../../academy-access.errors';
import { UpsertOrgAcademyAccessSettingsCommand } from './upsert-org-academy-access-settings.command';

@Injectable()
export class UpsertOrgAcademyAccessSettingsUseCase {
  constructor(
    @InjectPinoLogger(UpsertOrgAcademyAccessSettingsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: OrgAcademyAccessSettingsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyAccessError)
  async execute(
    command: UpsertOrgAcademyAccessSettingsCommand,
  ): Promise<OrgAcademyAccessSettings> {
    this.logger.info(
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
