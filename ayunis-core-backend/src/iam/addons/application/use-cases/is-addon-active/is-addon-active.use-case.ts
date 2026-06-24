import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { OrgAddonRepository } from '../../ports/org-addon.repository';
import { UnexpectedAddonError } from '../../addons.errors';
import { IsAddonActiveQuery } from './is-addon-active.query';

@Injectable()
export class IsAddonActiveUseCase {
  private readonly logger = new Logger(IsAddonActiveUseCase.name);

  constructor(private readonly orgAddonRepository: OrgAddonRepository) {}

  async execute(query: IsAddonActiveQuery): Promise<boolean> {
    this.logger.log('Checking if addon is active', {
      orgId: query.orgId,
      type: query.type,
    });

    try {
      const addon = await this.orgAddonRepository.findByOrgAndType(
        query.orgId,
        query.type,
      );
      return addon !== null;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error checking if addon is active', {
        error: error as Error,
      });
      throw new UnexpectedAddonError('check', { error: error as Error });
    }
  }
}
