import { Injectable } from '@nestjs/common';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import type { DeleteIpAllowlistCommand } from './delete-ip-allowlist.command';
import { IpAllowlistCachePort } from '../../ports/ip-allowlist-cache.port';

@Injectable()
export class DeleteIpAllowlistUseCase {
  constructor(
    private readonly repository: IpAllowlistRepository,
    private readonly ipAllowlistCache: IpAllowlistCachePort,
  ) {}

  async execute(command: DeleteIpAllowlistCommand): Promise<void> {
    await this.repository.deleteByOrgId(command.orgId);
    this.ipAllowlistCache.invalidateCache(command.orgId);
  }
}
