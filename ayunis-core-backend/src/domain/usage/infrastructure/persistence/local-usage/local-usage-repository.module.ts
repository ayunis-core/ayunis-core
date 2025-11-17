import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageRecord } from './schema/usage.record';
import { LocalUsageRepository } from './local-usage.repository';
import { UsageRepository } from '../../../application/ports/usage.repository';
import { UsageMapper } from './mappers/usage.mapper';
import { UsageQueryMapper } from './mappers/usage-query.mapper';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

@Module({
  imports: [TypeOrmModule.forFeature([UsageRecord, UserRecord])],
  providers: [
    LocalUsageRepository,
    UsageMapper,
    UsageQueryMapper,
    {
      provide: UsageRepository,
      useClass: LocalUsageRepository,
    },
  ],
  exports: [LocalUsageRepository, UsageMapper, UsageQueryMapper, UsageRepository],
})
export class LocalUsageRepositoryModule {}
