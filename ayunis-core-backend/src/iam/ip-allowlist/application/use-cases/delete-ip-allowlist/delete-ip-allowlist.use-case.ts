import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
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

  @HandleUnexpectedErrors(UnexpectedIpAllowlistError)
  async execute(command: DeleteIpAllowlistCommand): Promise<void> {
    this.logger.debug('Deleting IP allowlist', { orgId: command.orgId });

    await this.repository.deleteByOrgId(command.orgId);
    this.ipAllowlistCache.invalidateCache(command.orgId);
  }
}
