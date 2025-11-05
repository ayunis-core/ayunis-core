import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageRecord } from './schema/usage.record';
import { LocalUsageRepository } from './local-usage.repository';
import { UsageRepository } from '../../../application/ports/usage.repository';
import { UsageMapper } from './mappers/usage.mapper';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

@Module({
  imports: [TypeOrmModule.forFeature([UsageRecord, UserRecord])],
  providers: [
    LocalUsageRepository,
    UsageMapper,
    {
      provide: UsageRepository,
      useClass: LocalUsageRepository,
    },
  ],
  exports: [LocalUsageRepository, UsageMapper, UsageRepository],
})
export class LocalUsageRepositoryModule {}
