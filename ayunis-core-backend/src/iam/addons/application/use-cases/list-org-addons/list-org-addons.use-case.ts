import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { AddonStatus } from 'src/iam/addons/domain/addon-status';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { OrgAddonRepository } from '../../ports/org-addon.repository';
import { UnexpectedAddonError } from '../../addons.errors';
import { ListOrgAddonsQuery } from './list-org-addons.query';

@Injectable()
export class ListOrgAddonsUseCase {
  private readonly logger = new Logger(ListOrgAddonsUseCase.name);

  constructor(private readonly orgAddonRepository: OrgAddonRepository) {}

  async execute(query: ListOrgAddonsQuery): Promise<AddonStatus[]> {
    this.logger.log('Listing org addons', { orgId: query.orgId });

    try {
      const activeAddons = await this.orgAddonRepository.findAllByOrgId(
        query.orgId,
      );
      const activeTypes = new Set(activeAddons.map((addon) => addon.type));

      // Always return the full catalog so the caller sees inactive addons too.
      return Object.values(AddonType).map((type) => ({
        type,
        active: activeTypes.has(type),
      }));
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error listing org addons', {
        error: error as Error,
      });
      throw new UnexpectedAddonError('list', { error: error as Error });
    }
  }
}
