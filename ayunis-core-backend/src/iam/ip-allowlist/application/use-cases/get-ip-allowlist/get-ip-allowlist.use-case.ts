import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import { UnexpectedIpAllowlistError } from '../../ip-allowlist.errors';
import type { GetIpAllowlistQuery } from './get-ip-allowlist.query';
import type { IpAllowlist } from '../../../domain/ip-allowlist.entity';

@Injectable()
export class GetIpAllowlistUseCase {
  private readonly logger = new Logger(GetIpAllowlistUseCase.name);

  constructor(private readonly repository: IpAllowlistRepository) {}

  @HandleUnexpectedErrors(UnexpectedIpAllowlistError)
  async execute(query: GetIpAllowlistQuery): Promise<IpAllowlist | null> {
    this.logger.debug('Getting IP allowlist', { orgId: query.orgId });

    return await this.repository.findByOrgId(query.orgId);
  }
}
