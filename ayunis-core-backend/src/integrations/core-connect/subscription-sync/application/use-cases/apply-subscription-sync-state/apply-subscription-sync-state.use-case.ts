import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import type { SubscriptionSyncData } from 'src/iam/subscriptions/application/models/subscription-sync-state';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { assertSubscriptionSyncEnabled } from 'src/integrations/core-connect/subscription-sync/application/util/assert-subscription-sync-enabled.helper';
import { ApplySubscriptionSyncUseCase } from 'src/iam/subscriptions/application/use-cases/apply-subscription-sync/apply-subscription-sync.use-case';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { EndTrialUseCase } from 'src/iam/trials/application/use-cases/end-trial/end-trial.use-case';
import { SyncAcademyAddonUseCase } from 'src/iam/addons/application/use-cases/sync-academy-addon/sync-academy-addon.use-case';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import { SubscriptionSyncLinkRepository } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-link.repository';
import { SubscriptionSyncRevision } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-revision';
import { SubscriptionSyncEventsService } from 'src/integrations/core-connect/subscription-sync/application/services/subscription-sync-events.service';
import {
  StaleSubscriptionSyncError,
  InvalidSubscriptionSyncError,
  UnexpectedSubscriptionSyncError,
} from 'src/integrations/core-connect/subscription-sync/application/subscription-sync.errors';
import type { SubscriptionSyncCommand } from 'src/integrations/core-connect/subscription-sync/application/models/subscription-sync-command';

interface SubscriptionApplicationResult {
  changed: boolean;
  applied: boolean;
  previousOwnerId: string | null;
}

@Injectable()
export class ApplySubscriptionSyncStateUseCase {
  private readonly logger = new Logger(ApplySubscriptionSyncStateUseCase.name);
  constructor(
    private readonly config: ConfigService,
    private readonly findOrg: FindOrgByIdUseCase,
    private readonly subscriptions: ApplySubscriptionSyncUseCase,
    private readonly trial: EndTrialUseCase,
    private readonly academy: SyncAcademyAddonUseCase,
    private readonly events: SubscriptionSyncEventsService,
    private readonly links: SubscriptionSyncLinkRepository,
    private readonly revisions: SubscriptionSyncRevision,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSubscriptionSyncError)
  async execute(command: SubscriptionSyncCommand) {
    assertSubscriptionSyncEnabled(this.config);
    this.validate(command);
    const result = await this.applyLocked(command);
    this.logApplication(command, result);
    return { changed: result.changed };
  }

  private logApplication(
    command: SubscriptionSyncCommand,
    result: SubscriptionApplicationResult,
  ): void {
    const {
      type: subscriptionType = null,
      monthlyCredits = null,
      noOfSeats = null,
    } = command.subscription ?? {};
    let nextOwnerId = result.previousOwnerId;
    if (result.applied) nextOwnerId = command.revoke ? null : command.ownerId;
    this.logger.log(
      {
        orgId: command.orgId,
        deliveryId: command.deliveryId,
        revision: command.revision,
        ownerId: command.ownerId,
        previousOwnerId: result.previousOwnerId,
        nextOwnerId,
        subscriptionType,
        monthlyCredits,
        noOfSeats,
        academyActive: command.academyActive,
        revoke: command.revoke,
        changed: result.changed,
        outcome: result.applied ? 'applied' : 'ownership_mismatch',
      },
      result.applied
        ? 'External subscription state committed'
        : 'External subscription revocation skipped',
    );
  }

  private validate(command: SubscriptionSyncCommand): void {
    const state = command.subscription;
    if (
      (command.revoke && (state !== null || command.academyActive)) ||
      (!state && command.academyActive)
    )
      throw new InvalidSubscriptionSyncError(
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
      throw new InvalidSubscriptionSyncError(
        'Subscription allowance must be a positive safe integer',
      );
    if (state.endsAt && state.endsAt <= state.startsAt)
      throw new InvalidSubscriptionSyncError(
        'Subscription end must follow its start',
      );
  }

  @Transactional()
  private async applyLocked(
    command: SubscriptionSyncCommand,
  ): Promise<SubscriptionApplicationResult> {
    if (!(await this.revisions.isCurrent(command.orgId, command.revision)))
      throw new StaleSubscriptionSyncError();
    await this.findOrg.execute({ id: command.orgId });
    const current = await this.links.findByOrgId(command.orgId);
    const previousOwnerId = current ? current.ownerId : null;
    if (command.revoke && previousOwnerId !== command.ownerId)
      return {
        changed: false,
        applied: false,
        previousOwnerId,
      };
    // Subscription application acquires the allocation lock; the enclosing
    // transaction retains it through trial, Academy, ownership and event writes.
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
      applied: true,
      previousOwnerId,
    };
  }
}
