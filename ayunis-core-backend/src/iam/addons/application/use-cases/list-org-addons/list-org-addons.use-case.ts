import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AddonStatus } from 'src/iam/addons/domain/addon-status';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { OrgAddonRepository } from '../../ports/org-addon.repository';
import { UnexpectedAddonError } from '../../addons.errors';
import { ListOrgAddonsQuery } from './list-org-addons.query';

@Injectable()
export class ListOrgAddonsUseCase {
  constructor(
    @InjectPinoLogger(ListOrgAddonsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgAddonRepository: OrgAddonRepository,
  ) {}

  async execute(query: ListOrgAddonsQuery): Promise<AddonStatus[]> {
    this.logger.info({ orgId: query.orgId }, 'Listing org addons');

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
      this.logger.error({ err: error as Error }, 'Error listing org addons');
      throw new UnexpectedAddonError('list', { error: error as Error });
    }
  }
}
