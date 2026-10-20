import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FynnClient } from 'src/integrations/fynn/application/ports/fynn-client';
import { LoadFynnSnapshotService } from 'src/integrations/fynn/application/services/load-fynn-snapshot.service';
import {
  getFynnOrgId,
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
    private readonly emitter: EventEmitter2,
  ) {}

  @HandleUnexpectedErrors(UnexpectedFynnSyncError)
  async execute(command: {
    subscriptionId: string;
  }): Promise<{ orgId: UUID; changed: boolean }> {
    this.logger.log(
      { subscriptionId: command.subscriptionId },
      'Synchronizing Fynn subscription',
    );
    if (!this.config.get<boolean>('app.isCloudHosted'))
      throw new FynnConfigurationError();
    const subscription = await this.client.getSubscription(
      command.subscriptionId,
    );
    const customer = await this.client.getCustomer(subscription.customer.id);
    const orgId = getFynnOrgId(customer);
    const result = await this.synchronizeLocked(command.subscriptionId, orgId);
    // The transaction has committed before listeners can deliver external effects.
    for (const pending of result.events) {
      try {
        await this.emitter.emitAsync(pending.name, pending.event);
      } catch (error) {
        this.logger.error(
          { err: error, eventName: pending.name, orgId },
          'Fynn sync event listener failed after commit',
        );
      }
    }
    return { orgId, changed: result.changed };
  }

  @Transactional()
  private async synchronizeLocked(subscriptionId: string, orgId: UUID) {
    await this.lock.execute(orgId);
    await this.findOrg.execute({ id: orgId });
    const snapshot = await this.snapshots.load(subscriptionId, orgId);
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
    return {
      changed: applied.changed || trialChanged || addonEvents.length > 0,
      events: [...applied.events, ...addonEvents],
    };
  }
}
