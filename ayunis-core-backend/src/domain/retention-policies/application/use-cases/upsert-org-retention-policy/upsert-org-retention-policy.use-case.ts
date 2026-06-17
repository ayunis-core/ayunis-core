import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
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

    try {
      const existing = await this.repository.findByOrgId(command.orgId);
      const policy = new OrgRetentionPolicy({
        id: existing?.id,
        orgId: command.orgId,
        retentionDays: command.retentionDays,
        createdAt: existing?.createdAt,
        updatedAt: new Date(),
      });
      return await this.repository.upsert(policy);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error('Failed to upsert retention policy', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
      });

      throw new UnexpectedRetentionPolicyError('upsert', {
        orgId: command.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
