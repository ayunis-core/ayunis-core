import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import { IpAllowlistCachePort } from '../../ports/ip-allowlist-cache.port';
import { UnexpectedIpAllowlistError } from '../../ip-allowlist.errors';
import type { DeleteIpAllowlistCommand } from './delete-ip-allowlist.command';

@Injectable()
export class DeleteIpAllowlistUseCase {
  private readonly logger = new Logger(DeleteIpAllowlistUseCase.name);

  constructor(
    private readonly repository: IpAllowlistRepository,
    private readonly ipAllowlistCache: IpAllowlistCachePort,
  ) {}

  async execute(command: DeleteIpAllowlistCommand): Promise<void> {
    this.logger.debug('Deleting IP allowlist', { orgId: command.orgId });

    try {
      await this.repository.deleteByOrgId(command.orgId);
      this.ipAllowlistCache.invalidateCache(command.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error('Failed to delete IP allowlist', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
      });

      throw new UnexpectedIpAllowlistError('delete', {
        orgId: command.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
