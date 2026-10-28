import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { IpAllowlistRepository } from 'src/iam/ip-allowlist/application/ports/ip-allowlist.repository';
import { IpAllowlistCachePort } from 'src/iam/ip-allowlist/application/ports/ip-allowlist-cache.port';
import {
  AdminLockoutError,
  InvalidCidrApplicationError,
  UnexpectedIpAllowlistError,
} from 'src/iam/ip-allowlist/application/ip-allowlist.errors';
import {
  EmptyCidrsError,
  InvalidCidrError,
} from 'src/iam/ip-allowlist/domain/ip-allowlist.errors';
import type { UpdateIpAllowlistCommand } from './update-ip-allowlist.command';
import { IpAllowlist } from 'src/iam/ip-allowlist/domain/ip-allowlist.entity';
import { isIpInCidrs } from 'src/iam/ip-allowlist/domain/cidr.util';

@Injectable()
export class UpdateIpAllowlistUseCase {
  private readonly logger = new Logger(UpdateIpAllowlistUseCase.name);

  constructor(
    private readonly repository: IpAllowlistRepository,
    private readonly ipAllowlistCache: IpAllowlistCachePort,
  ) {}

  async execute(command: UpdateIpAllowlistCommand): Promise<IpAllowlist> {
    this.logger.debug(
      {
        orgId: command.orgId,
        cidrCount: command.cidrs.length,
      },
      'Updating IP allowlist',
    );

    try {
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
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error(
        {
          err: error as Error,
          orgId: command.orgId,
        },
        'Failed to update IP allowlist',
      );

      throw new UnexpectedIpAllowlistError('update', {
        orgId: command.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
