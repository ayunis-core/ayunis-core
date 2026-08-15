import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { OrgAddonRepository } from '../../ports/org-addon.repository';
import { UnexpectedAddonError } from '../../addons.errors';
import { IsAddonActiveQuery } from './is-addon-active.query';

@Injectable()
export class IsAddonActiveUseCase {
  constructor(
    @InjectPinoLogger(IsAddonActiveUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgAddonRepository: OrgAddonRepository,
  ) {}

  async execute(query: IsAddonActiveQuery): Promise<boolean> {
    this.logger.info(
      {
        orgId: query.orgId,
        type: query.type,
      },
      'Checking if addon is active',
    );

    try {
      const addon = await this.orgAddonRepository.findByOrgAndType(
        query.orgId,
        query.type,
      );
      return addon !== null;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Error checking if addon is active',
      );
      throw new UnexpectedAddonError('check', { error: error as Error });
    }
  }
}
