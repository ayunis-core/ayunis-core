import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { OrgNotFoundError } from 'src/iam/orgs/application/orgs.errors';
import type { AdmitOrgProcessingQuery } from './admit-org-processing.query';

@Injectable()
export class AdmitOrgProcessingUseCase {
  constructor(private readonly orgs: OrgsRepository) {}

  @Transactional()
  async execute(query: AdmitOrgProcessingQuery): Promise<boolean> {
    try {
      // BullMQ has already marked the job active. Holding this shared lock
      // until commit makes it visible to a deletion that owns the write lock.
      await this.orgs.findById(query.orgId, true);
      return true;
    } catch (error) {
      if (error instanceof OrgNotFoundError) return false;
      throw error;
    }
  }
}
