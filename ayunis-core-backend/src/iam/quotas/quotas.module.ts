import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageModule } from 'src/domain/usage/usage.module';
import { CreditLimitsModule } from 'src/iam/credit-limits/credit-limits.module';
import { PlatformConfigModule } from 'src/iam/platform-config/platform-config.module';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { UsageQuotaRecord } from './infrastructure/persistence/postgres/schema/usage-quota.record';
import { UsageQuotaRepositoryPort } from './application/ports/usage-quota.repository.port';
import { UsageQuotaRepository } from './infrastructure/persistence/postgres/usage-quota.repository';
import { ApiKeyCreditLimitGuardService } from './application/services/api-key-credit-limit-guard.service';
import { CreditBudgetGuardService } from './application/services/credit-budget-guard.service';
import { CreditLimitGuardService } from './application/services/credit-limit-guard.service';
import { InferenceAdmissionGuard } from './application/services/inference-admission-guard.service';
import { QuotaLimitResolverService } from './application/services/quota-limit-resolver.service';
import { CheckQuotaUseCase } from './application/use-cases/check-quota/check-quota.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageQuotaRecord]),
    PlatformConfigModule,
    SubscriptionsModule,
    UsageModule,
    CreditLimitsModule,
  ],
  providers: [
    {
      provide: UsageQuotaRepositoryPort,
      useClass: UsageQuotaRepository,
    },
    QuotaLimitResolverService,
    CheckQuotaUseCase,
    CreditBudgetGuardService,
    CreditLimitGuardService,
    ApiKeyCreditLimitGuardService,
    InferenceAdmissionGuard,
  ],
  exports: [CheckQuotaUseCase, InferenceAdmissionGuard],
})
export class QuotasModule {}
