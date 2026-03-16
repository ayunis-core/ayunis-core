import { Injectable } from '@nestjs/common';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import type { DeleteIpAllowlistCommand } from './delete-ip-allowlist.command';

@Injectable()
export class DeleteIpAllowlistUseCase {
  constructor(private readonly repository: IpAllowlistRepository) {}

  async execute(command: DeleteIpAllowlistCommand): Promise<void> {
    await this.repository.deleteByOrgId(command.orgId);
  }
}
