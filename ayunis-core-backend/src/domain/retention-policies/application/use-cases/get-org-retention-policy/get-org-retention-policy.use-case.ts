import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RetentionPoliciesRepository } from '../../ports/retention-policies.repository';
import { UnexpectedRetentionPolicyError } from '../../retention-policies.errors';
import type { OrgRetentionPolicy } from '../../../domain/org-retention-policy.entity';
import type { GetOrgRetentionPolicyQuery } from './get-org-retention-policy.query';

@Injectable()
export class GetOrgRetentionPolicyUseCase {
  private readonly logger = new Logger(GetOrgRetentionPolicyUseCase.name);

  constructor(private readonly repository: RetentionPoliciesRepository) {}

  /** Returns the org's policy, or null when retention has never been set. */
  @HandleUnexpectedErrors(UnexpectedRetentionPolicyError)
  async execute(
    query: GetOrgRetentionPolicyQuery,
  ): Promise<OrgRetentionPolicy | null> {
    this.logger.debug('Getting retention policy', { orgId: query.orgId });

    return await this.repository.findByOrgId(query.orgId);
  }
}
