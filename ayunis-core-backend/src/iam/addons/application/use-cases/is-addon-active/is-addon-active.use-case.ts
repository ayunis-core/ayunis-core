import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { OrgAddonRepository } from '../../ports/org-addon.repository';
import { UnexpectedAddonError } from '../../addons.errors';
import { IsAddonActiveQuery } from './is-addon-active.query';

@Injectable()
export class IsAddonActiveUseCase {
  private readonly logger = new Logger(IsAddonActiveUseCase.name);

  constructor(private readonly orgAddonRepository: OrgAddonRepository) {}

  @HandleUnexpectedErrors(UnexpectedAddonError)
  async execute(query: IsAddonActiveQuery): Promise<boolean> {
    this.logger.log('Checking if addon is active', {
      orgId: query.orgId,
      type: query.type,
    });

    const addon = await this.orgAddonRepository.findByOrgAndType(
      query.orgId,
      query.type,
    );
    return addon !== null;
  }
}
