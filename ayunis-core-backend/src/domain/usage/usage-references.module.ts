import { Module } from '@nestjs/common';
import { HasUsageForModelUseCase } from './application/use-cases/has-usage-for-model/has-usage-for-model.use-case';
import { LocalUsageRepositoryModule } from './infrastructure/persistence/local-usage/local-usage-repository.module';

@Module({
  imports: [LocalUsageRepositoryModule],
  providers: [HasUsageForModelUseCase],
  exports: [HasUsageForModelUseCase],
})
export class UsageReferencesModule {}
