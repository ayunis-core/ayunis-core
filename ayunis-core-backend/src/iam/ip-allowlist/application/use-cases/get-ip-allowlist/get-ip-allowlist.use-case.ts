import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import { UnexpectedIpAllowlistError } from '../../ip-allowlist.errors';
import type { GetIpAllowlistQuery } from './get-ip-allowlist.query';
import type { IpAllowlist } from 'src/iam/ip-allowlist/domain/ip-allowlist.entity';

@Injectable()
export class GetIpAllowlistUseCase {
  constructor(
    @InjectPinoLogger(GetIpAllowlistUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: IpAllowlistRepository,
  ) {}

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
