import { Injectable } from '@nestjs/common';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import type { UpdateIpAllowlistCommand } from './update-ip-allowlist.command';
import { IpAllowlist } from '../../../domain/ip-allowlist.entity';
import { isIpInCidrs } from '../../../domain/cidr.util';
import {
  EmptyCidrsError,
  InvalidCidrError,
} from '../../../domain/ip-allowlist.errors';
import {
  AdminLockoutError,
  InvalidCidrApplicationError,
} from '../../ip-allowlist.errors';

@Injectable()
export class UpdateIpAllowlistUseCase {
  constructor(private readonly repository: IpAllowlistRepository) {}

  async execute(command: UpdateIpAllowlistCommand): Promise<IpAllowlist> {
    // Validate CIDRs before lockout check so malformed input
    // produces InvalidCidrError, not AdminLockoutError.
    const existing = await this.repository.findByOrgId(command.orgId);
    let entity: IpAllowlist;
    try {
      entity = new IpAllowlist({
        id: existing?.id,
        orgId: command.orgId,
        cidrs: command.cidrs,
        createdAt: existing?.createdAt,
      });
    } catch (error) {
      if (
        error instanceof InvalidCidrError ||
        error instanceof EmptyCidrsError
      ) {
        throw new InvalidCidrApplicationError(error.message);
      }
      throw error;
    }

    if (!isIpInCidrs(command.clientIp, command.cidrs)) {
      throw new AdminLockoutError({ clientIp: command.clientIp });
    }

    return this.repository.upsert(entity);
  }
}
