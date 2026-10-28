import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { RetentionPoliciesRepository } from 'src/domain/retention-policies/application/ports/retention-policies.repository';
import { UnexpectedRetentionPolicyError } from 'src/domain/retention-policies/application/retention-policies.errors';
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
    this.logger.debug({ orgId: query.orgId }, 'Getting retention policy');

    try {
      return await this.repository.findByOrgId(query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error(
        {
          err: error as Error,
          orgId: query.orgId,
        },
        'Failed to get retention policy',
      );

      throw new UnexpectedRetentionPolicyError('get', {
        orgId: query.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
