import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import { IpAllowlistCachePort } from '../../ports/ip-allowlist-cache.port';
import { UnexpectedIpAllowlistError } from '../../ip-allowlist.errors';
import type { DeleteIpAllowlistCommand } from './delete-ip-allowlist.command';

@Injectable()
export class DeleteIpAllowlistUseCase {
  constructor(
    @InjectPinoLogger(DeleteIpAllowlistUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: IpAllowlistRepository,
    private readonly ipAllowlistCache: IpAllowlistCachePort,
  ) {}

  async execute(command: DeleteIpAllowlistCommand): Promise<void> {
    this.logger.debug({ orgId: command.orgId }, 'Deleting IP allowlist');

    try {
      await this.repository.deleteByOrgId(command.orgId);
      this.ipAllowlistCache.invalidateCache(command.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error(
        {
          err: error as Error,
          orgId: command.orgId,
        },
        'Failed to delete IP allowlist',
      );

      throw new UnexpectedIpAllowlistError('delete', {
        orgId: command.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
