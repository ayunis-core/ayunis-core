import { FynnResourceNotFoundError } from 'src/integrations/fynn/application/fynn.errors';
import { withFynnReadDeadline } from 'src/integrations/fynn/application/services/fynn-read-context';
import type { FynnSnapshot } from 'src/integrations/fynn/application/models/fynn-snapshot';
import { FynnSyncRevision } from 'src/integrations/fynn/application/ports/fynn-sync-revision';
import { FynnEntitlementsPendingError } from 'src/integrations/fynn/application/fynn.errors';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FynnOrgLinkRepository } from 'src/integrations/fynn/application/ports/fynn-org-link.repository';
import { FynnSyncEventsService } from 'src/integrations/fynn/application/services/fynn-sync-events.service';
import { RevokeUnlinkedFynnAccessUseCase } from 'src/integrations/fynn/application/use-cases/revoke-unlinked-fynn-access/revoke-unlinked-fynn-access.use-case';
import { FynnApiError } from 'src/integrations/fynn/application/fynn.errors';
import { FynnClient } from 'src/integrations/fynn/application/ports/fynn-client';
import { LoadFynnSnapshotService } from 'src/integrations/fynn/application/services/load-fynn-snapshot.service';
import {
  getOptionalFynnOrgId,
  mapFynnSubscription,
} from 'src/integrations/fynn/application/services/map-fynn-subscription';
import {
  FynnConfigurationError,
  UnexpectedFynnSyncError,
} from 'src/integrations/fynn/application/fynn.errors';
import { ApplySubscriptionSyncUseCase } from 'src/iam/subscriptions/application/use-cases/apply-subscription-sync/apply-subscription-sync.use-case';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { EndTrialUseCase } from 'src/iam/trials/application/use-cases/end-trial/end-trial.use-case';
import { SyncAcademyAddonUseCase } from 'src/iam/addons/application/use-cases/sync-academy-addon/sync-academy-addon.use-case';

@Injectable()
export class SyncFynnSubscriptionUseCase {
  private readonly logger = new Logger(SyncFynnSubscriptionUseCase.name);
  constructor(
    private readonly config: ConfigService,
    private readonly client: FynnClient,
    private readonly snapshots: LoadFynnSnapshotService,
    private readonly lock: AcquireSeatAllocationLockUseCase,
    private readonly findOrg: FindOrgByIdUseCase,
    private readonly subscriptions: ApplySubscriptionSyncUseCase,
    private readonly trial: EndTrialUseCase,
    private readonly academy: SyncAcademyAddonUseCase,
    private readonly events: FynnSyncEventsService,
    private readonly links: FynnOrgLinkRepository,
    private readonly cleanup: RevokeUnlinkedFynnAccessUseCase,
    private readonly revisions: FynnSyncRevision,
  ) {}

  @HandleUnexpectedErrors(UnexpectedFynnSyncError)
  async execute(command: {
    subscriptionId: string;
    deliveryId?: string;
  }): Promise<{ orgId: UUID | null; changed: boolean }> {
    return withFynnReadDeadline(() => this.synchronize(command));
  }

  private async synchronize(command: {
    subscriptionId: string;
    deliveryId?: string;
  }) {
    this.logger.log(
      {
        subscriptionId: command.subscriptionId,
        deliveryId: command.deliveryId,
      },
      'Synchronizing Fynn subscription',
    );
    if (
      !this.config.get<boolean>('app.isCloudHosted') ||
      !this.config.get<boolean>('features.fynnManagedSubscriptionsEnabled')
    )
      throw new FynnConfigurationError();
    const subscription = await this.client.getSubscription(
      command.subscriptionId,
    );
    const customer = await this.readCustomer(subscription.customer.id);
    const orgId = customer ? getOptionalFynnOrgId(customer) : null;
    const cleanup = await this.cleanupCustomer(
      subscription.customer.id,
      orgId ?? undefined,
      command.deliveryId,
    );
    if (!orgId) {
      if (customer) this.warnMissingLink(customer.id, command);
      return { orgId: null, changed: cleanup.changed > 0 };
    }
    await this.findOrg.execute({ id: orgId });
    const revision = await this.revisions.begin(orgId);
    const snapshot = await this.snapshots.load(command.subscriptionId, orgId);
    const result = await this.synchronizeLocked(snapshot, orgId, revision);

    return { orgId, changed: result.changed || cleanup.changed > 0 };
  }

  private warnMissingLink(
    customerId: string,
    command: { subscriptionId: string; deliveryId?: string },
  ): void {
    this.logger.warn(
      { code: 'FYNN_ORG_LINK_MISSING', customerId, ...command },
      'Fynn subscription has no ayunis-core-uuid; check the customer organization link',
    );
  }

  private async readCustomer(customerId: string) {
    try {
      return await this.client.getCustomer(customerId);
    } catch (error) {
      if (error instanceof FynnResourceNotFoundError) return null;
      throw error;
    }
  }

  private async cleanupCustomer(
    customerId: string,
    excludeOrgId?: UUID,
    deliveryId?: string,
  ) {
    const result = await this.cleanup.execute({
      customerId,
      excludeOrgId,
      deliveryId,
    });
    if (result.failed > 0) throw new FynnApiError();
    return result;
  }

  @Transactional()
  private async synchronizeLocked(
    snapshot: FynnSnapshot,
    orgId: UUID,
    revision: UUID,
  ) {
    if (!(await this.revisions.isCurrent(orgId, revision)))
      throw new FynnEntitlementsPendingError();
    await this.lock.execute(orgId);
    await this.findOrg.execute({ id: orgId });
    const state = mapFynnSubscription(snapshot, new Date());
    const applied = await this.subscriptions.execute(state);
    const trialChanged =
      applied.subscription && isActive(applied.subscription)
        ? await this.trial.execute(orgId)
        : false;
    const addonEvents = await this.academy.execute({
      orgId,
      active: state.academyActive,
    });
    await this.links.save({ orgId, customerId: snapshot.customer.id });
    const events = [...applied.events, ...addonEvents];
    await this.events.publish(orgId, events);
    await this.revisions.begin(orgId);
    return {
      changed: applied.changed || trialChanged || addonEvents.length > 0,
      events,
    };
  }
}
