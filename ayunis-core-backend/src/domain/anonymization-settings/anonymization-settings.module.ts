import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AnonymizationModule } from 'src/common/anonymization/anonymization.module';
import { AnonymizationWhitelistEntryRecord } from './infrastructure/persistence/postgres/schema/anonymization-whitelist-entry.record';
import { AnonymizationWhitelistRepository } from './application/ports/anonymization-whitelist.repository';
import { PostgresAnonymizationWhitelistRepository } from './infrastructure/persistence/postgres/anonymization-whitelist.repository';

import { GetPiiWhitelistUseCase } from './application/use-cases/get-pii-whitelist/get-pii-whitelist.use-case';
import { UpdatePiiWhitelistUseCase } from './application/use-cases/update-pii-whitelist/update-pii-whitelist.use-case';
import { AnonymizeTextForOrgUseCase } from './application/use-cases/anonymize-text-for-org/anonymize-text-for-org.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnonymizationWhitelistEntryRecord]),
    AnonymizationModule,
  ],
  providers: [
    {
      provide: AnonymizationWhitelistRepository,
      useClass: PostgresAnonymizationWhitelistRepository,
    },
    GetPiiWhitelistUseCase,
    UpdatePiiWhitelistUseCase,
    AnonymizeTextForOrgUseCase,
  ],
  exports: [
    GetPiiWhitelistUseCase,
    UpdatePiiWhitelistUseCase,
    AnonymizeTextForOrgUseCase,
  ],
})
export class AnonymizationSettingsModule {}
