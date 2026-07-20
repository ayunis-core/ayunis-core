import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { RetentionPoliciesRepository } from '../../ports/retention-policies.repository';
import { UnexpectedRetentionPolicyError } from '../../retention-policies.errors';
import type { OrgRetentionPolicy } from 'src/domain/retention-policies/domain/org-retention-policy.entity';
import type { GetOrgRetentionPolicyQuery } from './get-org-retention-policy.query';

@Injectable()
export class GetOrgRetentionPolicyUseCase {
  private readonly logger = new Logger(GetOrgRetentionPolicyUseCase.name);

  constructor(private readonly repository: RetentionPoliciesRepository) {}

  /** Returns the org's policy, or null when retention has never been set. */
  async execute(
    query: GetOrgRetentionPolicyQuery,
  ): Promise<OrgRetentionPolicy | null> {
    this.logger.debug('Getting retention policy', { orgId: query.orgId });

    try {
      return await this.repository.findByOrgId(query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error('Failed to get retention policy', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: query.orgId,
      });

      throw new UnexpectedRetentionPolicyError('get', {
        orgId: query.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
