import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AcademyModule } from 'src/domain/academy/academy.module';
import { AddonsModule } from '../addons/addons.module';
import { UsersModule } from 'src/iam/users/users.module';

import { OrgAcademyAccessSettingsRecord } from './infrastructure/persistence/postgres/schema/org-academy-access-settings.record';
import { OrgAcademyAccessSettingsMapper } from './infrastructure/persistence/postgres/mappers/org-academy-access-settings.mapper';
import { OrgAcademyAccessSettingsRepository } from './application/ports/org-academy-access-settings.repository';
import { PostgresOrgAcademyAccessSettingsRepository } from './infrastructure/persistence/postgres/org-academy-access-settings.repository';

import { GetOrgAcademyAccessSettingsUseCase } from './application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { UpsertOrgAcademyAccessSettingsUseCase } from './application/use-cases/upsert-org-academy-access-settings/upsert-org-academy-access-settings.use-case';
import { EvaluateAcademyAccessUseCase } from './application/use-cases/evaluate-academy-access/evaluate-academy-access.use-case';
import { ListOrgCertificateStatusesUseCase } from './application/use-cases/list-org-certificate-statuses/list-org-certificate-statuses.use-case';

import { AcademyCertificateGuard } from './application/guards/academy-certificate.guard';
import { AcademyAccessController } from './presenters/http/academy-access.controller';

/**
 * Owns the guard as well as the setting, mirroring IpAllowlistModule: the
 * module that has the data binds the guard, and IamModule owns the global
 * APP_GUARD registration and its ordering.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([OrgAcademyAccessSettingsRecord]),
    AddonsModule,
    AcademyModule,
    UsersModule,
  ],
  controllers: [AcademyAccessController],
  providers: [
    OrgAcademyAccessSettingsMapper,
    {
      provide: OrgAcademyAccessSettingsRepository,
      useClass: PostgresOrgAcademyAccessSettingsRepository,
    },
    GetOrgAcademyAccessSettingsUseCase,
    UpsertOrgAcademyAccessSettingsUseCase,
    EvaluateAcademyAccessUseCase,
    ListOrgCertificateStatusesUseCase,
    AcademyCertificateGuard,
  ],
  exports: [EvaluateAcademyAccessUseCase, AcademyCertificateGuard],
})
export class AcademyAccessModule {}
