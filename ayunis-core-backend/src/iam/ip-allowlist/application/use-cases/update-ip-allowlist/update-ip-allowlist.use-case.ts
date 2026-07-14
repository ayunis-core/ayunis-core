import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import { IpAllowlistCachePort } from '../../ports/ip-allowlist-cache.port';
import {
  AdminLockoutError,
  InvalidCidrApplicationError,
  UnexpectedIpAllowlistError,
} from '../../ip-allowlist.errors';
import {
  EmptyCidrsError,
  InvalidCidrError,
} from '../../../domain/ip-allowlist.errors';
import type { UpdateIpAllowlistCommand } from './update-ip-allowlist.command';
import { IpAllowlist } from '../../../domain/ip-allowlist.entity';
import { isIpInCidrs } from '../../../domain/cidr.util';

@Injectable()
export class UpdateIpAllowlistUseCase {
  private readonly logger = new Logger(UpdateIpAllowlistUseCase.name);

  constructor(
    private readonly repository: IpAllowlistRepository,
    private readonly ipAllowlistCache: IpAllowlistCachePort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedIpAllowlistError)
  async execute(command: UpdateIpAllowlistCommand): Promise<IpAllowlist> {
    this.logger.debug('Updating IP allowlist', {
      orgId: command.orgId,
      cidrCount: command.cidrs.length,
    });

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

    const result = await this.repository.upsert(entity);
    this.ipAllowlistCache.invalidateCache(command.orgId);

    return result;
  }
}
