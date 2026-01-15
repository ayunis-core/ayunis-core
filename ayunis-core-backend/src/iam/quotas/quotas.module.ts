import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageQuotaRecord } from './infrastructure/persistence/postgres/schema/usage-quota.record';
import { UsageQuotaRepositoryPort } from './application/ports/usage-quota.repository.port';
import { UsageQuotaRepository } from './infrastructure/persistence/postgres/usage-quota.repository';
import { QuotaLimitResolverService } from './application/services/quota-limit-resolver.service';
import { CheckQuotaUseCase } from './application/use-cases/check-quota/check-quota.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([UsageQuotaRecord])],
  providers: [
    {
      provide: UsageQuotaRepositoryPort,
      useClass: UsageQuotaRepository,
    },
    QuotaLimitResolverService,
    CheckQuotaUseCase,
  ],
  exports: [CheckQuotaUseCase],
})
export class QuotasModule {}
