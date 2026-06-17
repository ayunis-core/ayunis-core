import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import { UnexpectedIpAllowlistError } from '../../ip-allowlist.errors';
import type { GetIpAllowlistQuery } from './get-ip-allowlist.query';
import type { IpAllowlist } from '../../../domain/ip-allowlist.entity';

@Injectable()
export class GetIpAllowlistUseCase {
  private readonly logger = new Logger(GetIpAllowlistUseCase.name);

  constructor(private readonly repository: IpAllowlistRepository) {}

  async execute(query: GetIpAllowlistQuery): Promise<IpAllowlist | null> {
    this.logger.debug('Getting IP allowlist', { orgId: query.orgId });

    try {
      return await this.repository.findByOrgId(query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error('Failed to get IP allowlist', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: query.orgId,
      });

      throw new UnexpectedIpAllowlistError('get', {
        orgId: query.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
