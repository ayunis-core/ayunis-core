import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { AddonStatus } from '../../../domain/addon-status';
import { AddonType } from '../../../domain/value-objects/addon-type.enum';
import { OrgAddonRepository } from '../../ports/org-addon.repository';
import { UnexpectedAddonError } from '../../addons.errors';
import { ListOrgAddonsQuery } from './list-org-addons.query';

@Injectable()
export class ListOrgAddonsUseCase {
  private readonly logger = new Logger(ListOrgAddonsUseCase.name);

  constructor(private readonly orgAddonRepository: OrgAddonRepository) {}

  @HandleUnexpectedErrors(UnexpectedAddonError)
  async execute(query: ListOrgAddonsQuery): Promise<AddonStatus[]> {
    this.logger.log('Listing org addons', { orgId: query.orgId });

    const activeAddons = await this.orgAddonRepository.findAllByOrgId(
      query.orgId,
    );
    const activeTypes = new Set(activeAddons.map((addon) => addon.type));

    // Always return the full catalog so the caller sees inactive addons too.
    return Object.values(AddonType).map((type) => ({
      type,
      active: activeTypes.has(type),
    }));
  }
}
