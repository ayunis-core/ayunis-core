import { Injectable } from '@nestjs/common';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import type { GetIpAllowlistQuery } from './get-ip-allowlist.query';
import type { IpAllowlist } from '../../../domain/ip-allowlist.entity';

@Injectable()
export class GetIpAllowlistUseCase {
  constructor(private readonly repository: IpAllowlistRepository) {}

  async execute(query: GetIpAllowlistQuery): Promise<IpAllowlist | null> {
    return this.repository.findByOrgId(query.orgId);
  }
}
