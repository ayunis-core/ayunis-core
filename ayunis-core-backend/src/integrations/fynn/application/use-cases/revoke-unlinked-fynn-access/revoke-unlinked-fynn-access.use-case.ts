import {
  withFynnReadDeadline,
  fynnCustomersForOrg,
} from 'src/integrations/fynn/application/services/fynn-read-context';
import { FynnSyncRevision } from 'src/integrations/fynn/application/ports/fynn-sync-revision';
import {
  FynnEntitlementsPendingError,
  FynnResourceNotFoundError,
} from 'src/integrations/fynn/application/fynn.errors';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedFynnSyncError } from 'src/integrations/fynn/application/fynn.errors';
import { FynnClient } from 'src/integrations/fynn/application/ports/fynn-client';
import {
  FynnOrgLinkRepository,
  type FynnOrgLink,
} from 'src/integrations/fynn/application/ports/fynn-org-link.repository';
import { getOptionalFynnOrgId } from 'src/integrations/fynn/application/services/map-fynn-subscription';
import { FynnSyncEventsService } from 'src/integrations/fynn/application/services/fynn-sync-events.service';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { ApplySubscriptionSyncUseCase } from 'src/iam/subscriptions/application/use-cases/apply-subscription-sync/apply-subscription-sync.use-case';
import { SyncAcademyAddonUseCase } from 'src/iam/addons/application/use-cases/sync-academy-addon/sync-academy-addon.use-case';

@Injectable()
export class RevokeUnlinkedFynnAccessUseCase {
  private readonly logger = new Logger(RevokeUnlinkedFynnAccessUseCase.name);
  constructor(
    private readonly config: ConfigService,
    private readonly client: FynnClient,
    private readonly links: FynnOrgLinkRepository,
    private readonly lock: AcquireSeatAllocationLockUseCase,
    private readonly subscriptions: ApplySubscriptionSyncUseCase,
    private readonly academy: SyncAcademyAddonUseCase,
    private readonly events: FynnSyncEventsService,
    private readonly revisions: FynnSyncRevision,
  ) {}

  @HandleUnexpectedErrors(UnexpectedFynnSyncError)
  async execute(
    command: {
      customerId?: string;
      excludeOrgId?: UUID;
      deliveryId?: string;
    } = {},
  ) {
    return this.revoke(command);
  }

  private async revoke(command: {
    customerId?: string;
    excludeOrgId?: UUID;
    deliveryId?: string;
  }) {
    this.logger.log(
      { customerId: command.customerId, deliveryId: command.deliveryId },
      'Checking previously synchronized Fynn links',
    );
    const result = { processed: 0, changed: 0, failed: 0 };
    if (
      !this.config.get<boolean>('app.isCloudHosted') ||
      !this.config.get<boolean>('features.fynnManagedSubscriptionsEnabled')
    )
      return result;
    const links = await this.links.findAll(command.customerId);
    for (const link of links) {
      if (link.orgId === command.excludeOrgId) continue;
      try {
        const applied = await withFynnReadDeadline(() =>
          this.prepareRevocation(link),
        );
        result.processed++;
        if (applied.changed) result.changed++;
      } catch (error) {
        result.failed++;
        this.logger.error(
          { err: error, orgId: link.orgId, deliveryId: command.deliveryId },
          'Fynn link cleanup failed',
        );
      }
    }
    return result;
  }

  private async prepareRevocation(link: FynnOrgLink) {
    const revision = await this.revisions.observe(link.orgId);
    if (await this.hasSubscriptions(link))
      return { changed: false, events: [] };
    return this.revokeLocked(link, revision);
  }

  @Transactional()
  private async revokeLocked(link: FynnOrgLink, revision: UUID) {
    if (!(await this.revisions.isCurrent(link.orgId, revision)))
      throw new FynnEntitlementsPendingError();
    await this.lock.execute(link.orgId);
    const current = await this.links.findByOrgId(link.orgId);
    if (current?.customerId !== link.customerId)
      return { changed: false, events: [] };
    const applied = await this.subscriptions.execute({
      orgId: link.orgId,
      subscription: null,
    });
    const events = await this.academy.execute({
      orgId: link.orgId,
      active: false,
    });
    await this.links.delete(link.orgId);
    const pending = [...applied.events, ...events];
    await this.events.publish(link.orgId, pending);
    await this.revisions.begin(link.orgId);
    return {
      changed: applied.changed || events.length > 0,
      events: pending,
    };
  }

  private async hasSubscriptions(link: FynnOrgLink): Promise<boolean> {
    const customers = await this.client.listCustomerLinks();
    const previousCustomer = await this.currentCustomer(link.customerId);
    if (previousCustomer) getOptionalFynnOrgId(previousCustomer);
    const candidates = new Set(
      fynnCustomersForOrg(customers, link.orgId).map((customer) => customer.id),
    );
    candidates.add(link.customerId);
    for (const customerId of candidates) {
      const fresh =
        customerId === link.customerId
          ? previousCustomer
          : await this.currentCustomer(customerId);
      if (!fresh || getOptionalFynnOrgId(fresh) !== link.orgId) continue;
      if ((await this.client.listSubscriptions(customerId)).length > 0)
        return true;
    }
    return false;
  }
  private async currentCustomer(customerId: string) {
    try {
      return await this.client.getCustomer(customerId);
    } catch (error) {
      if (error instanceof FynnResourceNotFoundError) return null;
      throw error;
    }
  }
}
