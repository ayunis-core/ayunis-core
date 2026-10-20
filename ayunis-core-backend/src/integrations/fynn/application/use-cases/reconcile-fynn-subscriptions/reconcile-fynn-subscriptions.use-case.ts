import {
  fynnSweepContext,
  withFynnReadDeadline,
} from 'src/integrations/fynn/application/services/fynn-read-context';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  FynnClient,
  type FynnCustomerLink,
} from 'src/integrations/fynn/application/ports/fynn-client';
import {
  UnexpectedFynnSyncError,
  FynnResourceNotFoundError,
} from 'src/integrations/fynn/application/fynn.errors';
import { getOptionalFynnOrgId } from 'src/integrations/fynn/application/services/map-fynn-subscription';
import { RevokeUnlinkedFynnAccessUseCase } from 'src/integrations/fynn/application/use-cases/revoke-unlinked-fynn-access/revoke-unlinked-fynn-access.use-case';
import { SyncFynnSubscriptionUseCase } from 'src/integrations/fynn/application/use-cases/sync-fynn-subscription/sync-fynn-subscription.use-case';

export interface FynnReconciliationResult {
  processed: number;
  changed: number;
  failed: number;
  skipped: number;
}

@Injectable()
export class ReconcileFynnSubscriptionsUseCase {
  private readonly logger = new Logger(ReconcileFynnSubscriptionsUseCase.name);
  constructor(
    private readonly config: ConfigService,
    private readonly client: FynnClient,
    private readonly sync: SyncFynnSubscriptionUseCase,
    private readonly cleanup: RevokeUnlinkedFynnAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedFynnSyncError)
  async execute(
    command: { customerId?: string; deliveryId?: string } = {},
  ): Promise<FynnReconciliationResult> {
    return fynnSweepContext.run({}, () => this.reconcile(command));
  }

  private async reconcile(command: {
    customerId?: string;
    deliveryId?: string;
  }): Promise<FynnReconciliationResult> {
    this.logger.log(
      { deliveryId: command.deliveryId, customerId: command.customerId },
      'Starting Fynn reconciliation',
    );
    const result = { processed: 0, changed: 0, failed: 0, skipped: 0 };
    if (
      !this.config.get<boolean>('app.isCloudHosted') ||
      !this.config.get<boolean>('features.fynnManagedSubscriptionsEnabled')
    )
      return result;
    const customers = await withFynnReadDeadline(() =>
      this.discoverCustomers(command.customerId),
    );
    const seen = new Set<string>();
    for (const customer of customers)
      await this.synchronizeCustomer(
        customer,
        seen,
        result,
        command.deliveryId,
      );
    const cleanup = await this.cleanup.execute({
      customerId: command.customerId,
      deliveryId: command.deliveryId,
    });
    result.processed += cleanup.processed;
    result.changed += cleanup.changed;
    result.failed += cleanup.failed;
    this.logger.log(result, 'Fynn reconciliation completed');
    return result;
  }

  private async discoverCustomers(
    customerId?: string,
  ): Promise<FynnCustomerLink[]> {
    if (!customerId) return this.client.listCustomerLinks();
    try {
      return [await this.client.getCustomer(customerId)];
    } catch (error) {
      if (error instanceof FynnResourceNotFoundError) return [];
      throw error;
    }
  }

  private async synchronizeCustomer(
    customer: FynnCustomerLink,
    seen: Set<string>,
    result: FynnReconciliationResult,
    deliveryId?: string,
  ): Promise<void> {
    try {
      const orgId = getOptionalFynnOrgId(customer);
      if (!orgId || seen.has(orgId)) {
        if (!orgId) await this.warnMissingLink(customer.id, deliveryId);
        result.skipped++;
        return;
      }
      const subscriptions = await this.client.listSubscriptions(customer.id);
      if (subscriptions.length === 0) {
        result.skipped++;
        return;
      }
      seen.add(orgId);
      const applied = await this.sync.execute({
        subscriptionId: subscriptions[0].id,
        deliveryId,
      });
      result.processed++;
      if (applied.changed) result.changed++;
      this.logger.log(
        { orgId, changed: applied.changed, deliveryId },
        'Reconciled Fynn organization',
      );
    } catch (error) {
      result.failed++;
      this.logger.error(
        { err: error, customerId: customer.id },
        'Fynn organization reconciliation failed',
      );
    }
  }
  private async warnMissingLink(customerId: string, deliveryId?: string) {
    if ((await this.client.listSubscriptions(customerId)).length === 0) return;
    this.logger.warn(
      { code: 'FYNN_ORG_LINK_MISSING', customerId, deliveryId },
      'Fynn customer has subscriptions but no ayunis-core-uuid; check the customer organization link',
    );
  }
}
