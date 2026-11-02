import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { assertSubscriptionSyncEnabled } from 'src/integrations/core-connect/subscription-sync/application/util/assert-subscription-sync-enabled.helper';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { SubscriptionSyncRevision } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-revision';
import { UnexpectedSubscriptionSyncError } from 'src/integrations/core-connect/subscription-sync/application/subscription-sync.errors';

@Injectable()
export class PrepareSubscriptionSyncUseCase {
  private readonly logger = new Logger(PrepareSubscriptionSyncUseCase.name);
  constructor(
    private readonly config: ConfigService,
    private readonly findOrg: FindOrgByIdUseCase,
    private readonly revisions: SubscriptionSyncRevision,
  ) {}
  @HandleUnexpectedErrors(UnexpectedSubscriptionSyncError)
  async execute(command: { orgId: UUID; mode: 'sync' | 'cleanup' }) {
    this.logger.log(
      { orgId: command.orgId },
      'Preparing external subscription synchronization',
    );
    assertSubscriptionSyncEnabled(this.config);
    await this.findOrg.execute({ id: command.orgId });
    const revision =
      command.mode === 'sync'
        ? await this.revisions.begin(command.orgId)
        : await this.revisions.observe(command.orgId);
    return { revision };
  }
}
