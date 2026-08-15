import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';

import { TokensConsumedEvent } from 'src/domain/usage/application/events/tokens-consumed.event';

import { BudgetAlertEvaluator } from '../services/budget-alert-evaluator.service';

const EVALUATION_COOLDOWN_MS = 10 * 60 * 1000;

interface CooldownState {
  timer: NodeJS.Timeout;
  pending: boolean;
}

/**
 * Triggers budget-alert evaluation after token usage. Usage can only cross a
 * threshold when tokens are consumed, and the event is emitted after the
 * usage row is persisted, so the evaluation sees the crossing this very
 * message caused. A budget lowered mid-month below the already-consumed
 * amount is alerted on the org's next activity, or at the latest by the
 * daily sweep (BudgetAlertEvaluationTask).
 *
 * The cooldown is a leading+trailing debounce, not a plain skip: the first
 * event evaluates immediately, and if further usage arrives during the
 * window, one trailing evaluation runs when it expires. The trailing check
 * must not depend on a later event — an org that exhausts its budget inside
 * the window gets every subsequent run blocked, so no later event would
 * arrive to deliver the 100% email.
 *
 * Notification persistence remains responsible for preventing duplicate
 * alerts; BudgetAlertEvaluator serializes runs per org so a run that
 * outlives the cooldown never overlaps the trailing one.
 *
 * Note: the cooldown is not distributed. When multiple application replicas
 * are running, each replica may evaluate the same organization independently.
 */
@Injectable()
export class BudgetAlertsListener implements OnModuleDestroy {
  private readonly cooldowns = new Map<UUID, CooldownState>();

  constructor(
    @InjectPinoLogger(BudgetAlertsListener.name)
    private readonly logger: PinoLogger,
    private readonly budgetAlertEvaluator: BudgetAlertEvaluator,
  ) {}

  onModuleDestroy(): void {
    for (const state of this.cooldowns.values()) {
      clearTimeout(state.timer);
    }
    this.cooldowns.clear();
  }

  @OnEvent(TokensConsumedEvent.EVENT_NAME)
  async handleTokensConsumed(event: TokensConsumedEvent): Promise<void> {
    const orgId = event.orgId;

    if (!orgId) {
      return;
    }

    const state = this.cooldowns.get(orgId);
    if (state) {
      state.pending = true;
      return;
    }

    this.startCooldown(orgId);
    this.logger.debug(
      {
        orgId,
      },
      'Evaluating budget alerts after token consumption',
    );
    await this.budgetAlertEvaluator.evaluate(orgId);
  }

  private startCooldown(orgId: UUID): void {
    const timer = setTimeout(
      () => this.onCooldownExpired(orgId),
      EVALUATION_COOLDOWN_MS,
    );

    timer.unref();
    this.cooldowns.set(orgId, { timer, pending: false });
  }

  private onCooldownExpired(orgId: UUID): void {
    const state = this.cooldowns.get(orgId);
    this.cooldowns.delete(orgId);
    if (!state?.pending) {
      return;
    }

    this.startCooldown(orgId);
    void this.budgetAlertEvaluator.evaluate(orgId);
  }
}
