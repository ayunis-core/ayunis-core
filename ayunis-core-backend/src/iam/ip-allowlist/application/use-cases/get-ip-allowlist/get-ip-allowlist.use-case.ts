import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { IpAllowlistRepository } from 'src/iam/ip-allowlist/application/ports/ip-allowlist.repository';
import { UnexpectedIpAllowlistError } from 'src/iam/ip-allowlist/application/ip-allowlist.errors';
import type { GetIpAllowlistQuery } from './get-ip-allowlist.query';
import type { IpAllowlist } from 'src/iam/ip-allowlist/domain/ip-allowlist.entity';

@Injectable()
export class GetIpAllowlistUseCase {
  private readonly logger = new Logger(GetIpAllowlistUseCase.name);

  constructor(private readonly repository: IpAllowlistRepository) {}

  async execute(query: GetIpAllowlistQuery): Promise<IpAllowlist | null> {
    this.logger.debug({ orgId: query.orgId }, 'Getting IP allowlist');

    try {
      return await this.repository.findByOrgId(query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      this.logger.error(
        {
          err: error as Error,
          orgId: query.orgId,
        },
        'Failed to get IP allowlist',
      );

      throw new UnexpectedIpAllowlistError('get', {
        orgId: query.orgId,
        ...(error instanceof Error && { originalError: error.message }),
      });
    }
  }
}
