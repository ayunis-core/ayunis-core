import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RetentionPoliciesRepository } from '../../ports/retention-policies.repository';
import {
  InvalidRetentionPeriodError,
  UnexpectedRetentionPolicyError,
} from '../../retention-policies.errors';
import { OrgRetentionPolicy } from '../../../domain/org-retention-policy.entity';
import { isValidRetentionDays } from '../../../domain/retention-period';
import type { UpsertOrgRetentionPolicyCommand } from './upsert-org-retention-policy.command';

@Injectable()
export class UpsertOrgRetentionPolicyUseCase {
  private readonly logger = new Logger(UpsertOrgRetentionPolicyUseCase.name);

  constructor(private readonly repository: RetentionPoliciesRepository) {}

  @HandleUnexpectedErrors(UnexpectedRetentionPolicyError)
  async execute(
    command: UpsertOrgRetentionPolicyCommand,
  ): Promise<OrgRetentionPolicy> {
    this.logger.log('Upserting retention policy', {
      orgId: command.orgId,
      retentionDays: command.retentionDays,
    });

    if (!isValidRetentionDays(command.retentionDays)) {
      throw new InvalidRetentionPeriodError(command.retentionDays, {
        orgId: command.orgId,
      });
    }

    const existing = await this.repository.findByOrgId(command.orgId);
    const policy = new OrgRetentionPolicy({
      id: existing?.id,
      orgId: command.orgId,
      retentionDays: command.retentionDays,
      createdAt: existing?.createdAt,
      updatedAt: new Date(),
    });
    return await this.repository.upsert(policy);
  }
}
