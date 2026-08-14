import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { RetentionPoliciesRepository } from '../../ports/retention-policies.repository';
import { UnexpectedRetentionPolicyError } from '../../retention-policies.errors';
import type { OrgRetentionPolicy } from 'src/domain/retention-policies/domain/org-retention-policy.entity';
import type { GetOrgRetentionPolicyQuery } from './get-org-retention-policy.query';

@Injectable()
export class GetOrgRetentionPolicyUseCase {
  constructor(
    @InjectPinoLogger(GetOrgRetentionPolicyUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: RetentionPoliciesRepository,
  ) {}

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
