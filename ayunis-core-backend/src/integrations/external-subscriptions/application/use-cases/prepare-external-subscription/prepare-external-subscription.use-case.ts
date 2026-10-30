import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { ExternalSubscriptionRevision } from 'src/integrations/external-subscriptions/application/ports/external-subscription-revision';
import {
  ExternalSubscriptionDisabledError,
  UnexpectedExternalSubscriptionError,
} from 'src/integrations/external-subscriptions/application/external-subscription.errors';

@Injectable()
export class PrepareExternalSubscriptionUseCase {
  private readonly logger = new Logger(PrepareExternalSubscriptionUseCase.name);
  constructor(
    private readonly config: ConfigService,
    private readonly findOrg: FindOrgByIdUseCase,
    private readonly revisions: ExternalSubscriptionRevision,
  ) {}
  @HandleUnexpectedErrors(UnexpectedExternalSubscriptionError)
  async execute(command: { orgId: UUID; mode: 'sync' | 'cleanup' }) {
    this.logger.log(
      { orgId: command.orgId },
      'Preparing external subscription synchronization',
    );
    if (
      !this.config.get<boolean>('app.isCloudHosted') ||
      !this.config.get<boolean>('features.externalSubscriptionsEnabled')
    )
      throw new ExternalSubscriptionDisabledError();
    await this.findOrg.execute({ id: command.orgId });
    const revision =
      command.mode === 'sync'
        ? await this.revisions.begin(command.orgId)
        : await this.revisions.observe(command.orgId);
    return { revision };
  }
}
