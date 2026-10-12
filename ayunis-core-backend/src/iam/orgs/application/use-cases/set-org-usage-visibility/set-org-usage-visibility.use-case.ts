import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import {
  OrgUnauthorizedError,
  UnexpectedOrgError,
} from 'src/iam/orgs/application/orgs.errors';
import { isSuperAdmin } from 'src/common/context/required-context';
import type { Org } from 'src/iam/orgs/domain/org.entity';
import type { SetOrgUsageVisibilityCommand } from './set-org-usage-visibility.command';

@Injectable()
export class SetOrgUsageVisibilityUseCase {
  private readonly logger = new Logger(SetOrgUsageVisibilityUseCase.name);
  constructor(
    private readonly orgs: OrgsRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOrgError)
  async execute(command: SetOrgUsageVisibilityCommand): Promise<Org> {
    this.logger.log(
      { orgId: command.orgId },
      'Setting individual usage visibility',
    );
    if (!isSuperAdmin(this.context)) {
      throw new OrgUnauthorizedError('Super admin privileges required');
    }
    return this.orgs.updateUsageVisibility(
      command.orgId,
      command.hideIndividualUsage,
    );
  }
}
