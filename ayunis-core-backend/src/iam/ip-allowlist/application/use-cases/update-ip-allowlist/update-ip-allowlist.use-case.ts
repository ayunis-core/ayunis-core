import { Injectable } from '@nestjs/common';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import type { UpdateIpAllowlistCommand } from './update-ip-allowlist.command';
import { IpAllowlist } from '../../../domain/ip-allowlist.entity';
import { isIpInCidrs } from '../../../domain/cidr.util';
import { AdminLockoutError } from '../../ip-allowlist.errors';

@Injectable()
export class UpdateIpAllowlistUseCase {
  constructor(private readonly repository: IpAllowlistRepository) {}

  async execute(
    command: UpdateIpAllowlistCommand,
  ): Promise<IpAllowlist | null> {
    if (command.cidrs.length === 0) {
      await this.repository.deleteByOrgId(command.orgId);
      return null;
    }

    // Validate CIDRs before lockout check so malformed input
    // produces InvalidCidrError, not AdminLockoutError.
    const existing = await this.repository.findByOrgId(command.orgId);
    const entity = new IpAllowlist({
      id: existing?.id,
      orgId: command.orgId,
      cidrs: command.cidrs,
      createdAt: existing?.createdAt,
    });

    if (!isIpInCidrs(command.clientIp, command.cidrs)) {
      throw new AdminLockoutError({ clientIp: command.clientIp });
    }

    return this.repository.upsert(entity);
  }
}
