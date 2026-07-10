import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { OrgMfaRequirementsRepository } from '../../../application/ports/org-mfa-requirements.repository';
import { OrgMfaRequirement } from '../../../domain/org-mfa-requirement.entity';
import { OrgMfaRequirementRecord } from './schema/org-mfa-requirement.record';
import { OrgMfaRequirementMapper } from './mappers/org-mfa-requirement.mapper';

@Injectable()
export class LocalOrgMfaRequirementsRepository extends OrgMfaRequirementsRepository {
  constructor(
    @InjectRepository(OrgMfaRequirementRecord)
    private readonly repository: Repository<OrgMfaRequirementRecord>,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<OrgMfaRequirement | null> {
    const record = await this.repository.findOne({ where: { orgId } });
    return record ? OrgMfaRequirementMapper.toDomain(record) : null;
  }

  async upsert(requirement: OrgMfaRequirement): Promise<OrgMfaRequirement> {
    const saved = await this.repository.save(
      OrgMfaRequirementMapper.toRecord(requirement),
    );
    return OrgMfaRequirementMapper.toDomain(saved);
  }
}
