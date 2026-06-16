import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, IsNull, Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { RetentionPoliciesRepository } from '../../../application/ports/retention-policies.repository';
import { OrgRetentionPolicy } from '../../../domain/org-retention-policy.entity';
import { OrgRetentionPolicyRecord } from './schema/org-retention-policy.record';
import { OrgRetentionPolicyMapper } from './mappers/org-retention-policy.mapper';

@Injectable()
export class PostgresRetentionPoliciesRepository extends RetentionPoliciesRepository {
  private readonly logger = new Logger(
    PostgresRetentionPoliciesRepository.name,
  );

  constructor(
    @InjectRepository(OrgRetentionPolicyRecord)
    private readonly repository: Repository<OrgRetentionPolicyRecord>,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<OrgRetentionPolicy | null> {
    const record = await this.repository.findOne({ where: { orgId } });
    return record ? OrgRetentionPolicyMapper.toDomain(record) : null;
  }

  async upsert(policy: OrgRetentionPolicy): Promise<OrgRetentionPolicy> {
    this.logger.debug('upsert', {
      orgId: policy.orgId,
      retentionDays: policy.retentionDays,
    });
    const saved = await this.repository.save(
      OrgRetentionPolicyMapper.toRecord(policy),
    );
    return OrgRetentionPolicyMapper.toDomain(saved);
  }

  async findAllEnabled(): Promise<OrgRetentionPolicy[]> {
    const records = await this.repository.find({
      where: { retentionDays: Not(IsNull()) },
    });
    return records.map((record) => OrgRetentionPolicyMapper.toDomain(record));
  }
}
