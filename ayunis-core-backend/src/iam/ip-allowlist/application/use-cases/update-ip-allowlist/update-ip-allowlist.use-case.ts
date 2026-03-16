import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
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

  constructor(private readonly repository: IpAllowlistRepository) {}

  async execute(command: UpdateIpAllowlistCommand): Promise<IpAllowlist> {
    this.logger.debug('Updating IP allowlist', {
      orgId: command.orgId,
      cidrCount: command.cidrs.length,
    });

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

      return await this.repository.upsert(entity);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error('Failed to update IP allowlist', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
      });

      throw new UnexpectedIpAllowlistError('update', {
        orgId: command.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
