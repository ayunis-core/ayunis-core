import { Module } from '@nestjs/common';
import { LocalLegalAcceptancesRepository } from './infrastructure/persistence/local/local-legal-acceptances.repository';
import { LegalAcceptancesMapper } from './infrastructure/persistence/local/mappers/legal-acceptances.mapper';
import { LegalAcceptanceRecord } from './infrastructure/persistence/local/schema/legal-acceptance.record';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegalAcceptancesRepository } from './application/ports/legal-acceptances.repository';
import { CreateLegalAcceptanceUseCase } from './application/use-cases/create-legal-acceptance/create-legal-acceptance.use-case';
import { HasAcceptedLatestVersionUseCase } from './application/use-cases/has-accepted-latest-version/has-accepted-latest-version.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([LegalAcceptanceRecord])],
  providers: [
    {
      provide: LegalAcceptancesRepository,
      useClass: LocalLegalAcceptancesRepository,
    },
    LegalAcceptancesMapper,
    CreateLegalAcceptanceUseCase,
    HasAcceptedLatestVersionUseCase,
  ],
  exports: [CreateLegalAcceptanceUseCase, HasAcceptedLatestVersionUseCase],
})
export class LegalAcceptancesModule {}
