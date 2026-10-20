import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import type { SubscriptionSyncData } from 'src/iam/subscriptions/application/models/subscription-sync-state';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { ApplySubscriptionSyncUseCase } from 'src/iam/subscriptions/application/use-cases/apply-subscription-sync/apply-subscription-sync.use-case';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { EndTrialUseCase } from 'src/iam/trials/application/use-cases/end-trial/end-trial.use-case';
import { SyncAcademyAddonUseCase } from 'src/iam/addons/application/use-cases/sync-academy-addon/sync-academy-addon.use-case';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import { ExternalSubscriptionLinkRepository } from 'src/integrations/external-subscriptions/application/ports/external-subscription-link.repository';
import { ExternalSubscriptionRevision } from 'src/integrations/external-subscriptions/application/ports/external-subscription-revision';
import { ExternalSubscriptionEventsService } from 'src/integrations/external-subscriptions/application/services/external-subscription-events.service';
import {
  ExternalSubscriptionDisabledError,
  StaleExternalSubscriptionError,
  InvalidExternalSubscriptionError,
  UnexpectedExternalSubscriptionError,
} from 'src/integrations/external-subscriptions/application/external-subscription.errors';
import type { ExternalSubscriptionCommand } from 'src/integrations/external-subscriptions/application/models/external-subscription-command';

@Injectable()
export class ApplyExternalSubscriptionUseCase {
  private readonly logger = new Logger(ApplyExternalSubscriptionUseCase.name);
  constructor(
    private readonly config: ConfigService,
    private readonly lock: AcquireSeatAllocationLockUseCase,
    private readonly findOrg: FindOrgByIdUseCase,
    private readonly subscriptions: ApplySubscriptionSyncUseCase,
    private readonly trial: EndTrialUseCase,
    private readonly academy: SyncAcademyAddonUseCase,
    private readonly events: ExternalSubscriptionEventsService,
    private readonly links: ExternalSubscriptionLinkRepository,
    private readonly revisions: ExternalSubscriptionRevision,
  ) {}

  @HandleUnexpectedErrors(UnexpectedExternalSubscriptionError)
  async execute(command: ExternalSubscriptionCommand) {
    this.logger.log(
      { orgId: command.orgId, deliveryId: command.deliveryId },
      'Applying external subscription state',
    );
    if (
      !this.config.get<boolean>('app.isCloudHosted') ||
      !this.config.get<boolean>('features.externalSubscriptionsEnabled')
    )
      throw new ExternalSubscriptionDisabledError();
    this.validate(command);
    return this.applyLocked(command);
  }

  private validate(command: ExternalSubscriptionCommand): void {
    const state = command.subscription;
    if (
      (command.revoke && (state !== null || command.academyActive)) ||
      (!state && command.academyActive)
    )
      throw new InvalidExternalSubscriptionError(
        'Revoked or absent subscriptions cannot grant Academy access',
      );
    if (!state) return;
    this.validateAllowance(state);
  }

  private validateAllowance(state: SubscriptionSyncData): void {
    const amount =
      state.type === SubscriptionType.SEAT_BASED
        ? state.noOfSeats
        : state.monthlyCredits;
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new InvalidExternalSubscriptionError(
        'Subscription allowance must be a positive safe integer',
      );
    if (state.endsAt && state.endsAt <= state.startsAt)
      throw new InvalidExternalSubscriptionError(
        'Subscription end must follow its start',
      );
  }

  @Transactional()
  private async applyLocked(command: ExternalSubscriptionCommand) {
    if (!(await this.revisions.isCurrent(command.orgId, command.revision)))
      throw new StaleExternalSubscriptionError();
    await this.lock.execute(command.orgId);
    await this.findOrg.execute({ id: command.orgId });
    const current = await this.links.findByOrgId(command.orgId);
    if (command.revoke && current?.ownerId !== command.ownerId)
      return { changed: false };
    const applied = await this.subscriptions.execute(command);
    const trialChanged =
      applied.subscription && isActive(applied.subscription)
        ? await this.trial.execute(command.orgId)
        : false;
    const addonEvents = await this.academy.execute({
      orgId: command.orgId,
      active: command.academyActive,
    });
    if (command.revoke) await this.links.delete(command.orgId);
    else
      await this.links.save({ orgId: command.orgId, ownerId: command.ownerId });
    await this.events.publish(command.orgId, [
      ...applied.events,
      ...addonEvents,
    ]);
    await this.revisions.begin(command.orgId);
    return {
      changed: applied.changed || trialChanged || addonEvents.length > 0,
    };
  }
}
