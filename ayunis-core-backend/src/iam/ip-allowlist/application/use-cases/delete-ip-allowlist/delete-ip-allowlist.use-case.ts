import { Injectable } from '@nestjs/common';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import type { DeleteIpAllowlistCommand } from './delete-ip-allowlist.command';
import { IpAllowlistGuard } from '../../guards/ip-allowlist.guard';

@Injectable()
export class DeleteIpAllowlistUseCase {
  constructor(
    private readonly repository: IpAllowlistRepository,
    private readonly ipAllowlistGuard: IpAllowlistGuard,
  ) {}

  async execute(command: DeleteIpAllowlistCommand): Promise<void> {
    await this.repository.deleteByOrgId(command.orgId);
    this.ipAllowlistGuard.invalidateCache(command.orgId);
  }
}
