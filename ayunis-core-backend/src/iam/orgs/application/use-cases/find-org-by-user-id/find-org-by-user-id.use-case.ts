import { Injectable } from '@nestjs/common';
import { FindOrgByUserIdQuery } from './find-org-by-user-id.query';
import { OrgsRepository } from '../../ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';

@Injectable()
export class FindOrgByUserIdUseCase {
  constructor(private readonly orgsRepository: OrgsRepository) {}

  async execute(query: FindOrgByUserIdQuery): Promise<Org> {
    const org = await this.orgsRepository.findByUserId(query.userId);
    return org;
  }
}
