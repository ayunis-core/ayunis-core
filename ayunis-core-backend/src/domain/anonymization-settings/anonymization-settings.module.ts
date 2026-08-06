import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AnonymizationModule } from 'src/common/anonymization/anonymization.module';
import { AnonymizationWhitelistEntryRecord } from './infrastructure/persistence/postgres/schema/anonymization-whitelist-entry.record';
import { GlobalAnonymizationWhitelistWordRecord } from './infrastructure/persistence/postgres/schema/global-anonymization-whitelist-word.record';
import { AnonymizationWhitelistRepository } from './application/ports/anonymization-whitelist.repository';
import { PostgresAnonymizationWhitelistRepository } from './infrastructure/persistence/postgres/anonymization-whitelist.repository';
import { GlobalAnonymizationWhitelistRepository } from './application/ports/global-anonymization-whitelist.repository';
import { PostgresGlobalAnonymizationWhitelistRepository } from './infrastructure/persistence/postgres/global-anonymization-whitelist.repository';

import { GetPiiWhitelistUseCase } from './application/use-cases/get-pii-whitelist/get-pii-whitelist.use-case';
import { UpdatePiiWhitelistUseCase } from './application/use-cases/update-pii-whitelist/update-pii-whitelist.use-case';
import { AnonymizeTextForOrgUseCase } from './application/use-cases/anonymize-text-for-org/anonymize-text-for-org.use-case';
import { GetGlobalPiiWhitelistUseCase } from './application/use-cases/get-global-pii-whitelist/get-global-pii-whitelist.use-case';
import { AddGlobalPiiWhitelistWordUseCase } from './application/use-cases/add-global-pii-whitelist-word/add-global-pii-whitelist-word.use-case';
import { DeleteGlobalPiiWhitelistWordUseCase } from './application/use-cases/delete-global-pii-whitelist-word/delete-global-pii-whitelist-word.use-case';
import { AnonymizationSettingsController } from './presenters/http/anonymization-settings.controller';
import { SuperAdminAnonymizationWhitelistController } from './presenters/http/super-admin-anonymization-whitelist.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnonymizationWhitelistEntryRecord,
      GlobalAnonymizationWhitelistWordRecord,
    ]),
    AnonymizationModule,
  ],
  controllers: [
    AnonymizationSettingsController,
    SuperAdminAnonymizationWhitelistController,
  ],
  providers: [
    {
      provide: AnonymizationWhitelistRepository,
      useClass: PostgresAnonymizationWhitelistRepository,
    },
    {
      provide: GlobalAnonymizationWhitelistRepository,
      useClass: PostgresGlobalAnonymizationWhitelistRepository,
    },
    GetPiiWhitelistUseCase,
    UpdatePiiWhitelistUseCase,
    AnonymizeTextForOrgUseCase,
    GetGlobalPiiWhitelistUseCase,
    AddGlobalPiiWhitelistWordUseCase,
    DeleteGlobalPiiWhitelistWordUseCase,
  ],
  exports: [
    GetPiiWhitelistUseCase,
    UpdatePiiWhitelistUseCase,
    AnonymizeTextForOrgUseCase,
    GetGlobalPiiWhitelistUseCase,
  ],
})
export class AnonymizationSettingsModule {}
