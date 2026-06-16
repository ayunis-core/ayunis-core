import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrgRetentionPolicyRecord } from './infrastructure/persistence/postgres/schema/org-retention-policy.record';
import { RetentionPoliciesRepository } from './application/ports/retention-policies.repository';
import { PostgresRetentionPoliciesRepository } from './infrastructure/persistence/postgres/postgres-retention-policies.repository';
import { GetOrgRetentionPolicyUseCase } from './application/use-cases/get-org-retention-policy/get-org-retention-policy.use-case';
import { UpsertOrgRetentionPolicyUseCase } from './application/use-cases/upsert-org-retention-policy/upsert-org-retention-policy.use-case';
import { RetentionPoliciesController } from './presenters/http/retention-policies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrgRetentionPolicyRecord])],
  controllers: [RetentionPoliciesController],
  providers: [
    {
      provide: RetentionPoliciesRepository,
      useClass: PostgresRetentionPoliciesRepository,
    },
    GetOrgRetentionPolicyUseCase,
    UpsertOrgRetentionPolicyUseCase,
  ],
  exports: [GetOrgRetentionPolicyUseCase, UpsertOrgRetentionPolicyUseCase],
})
export class RetentionPoliciesModule {}
