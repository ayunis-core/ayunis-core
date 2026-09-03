import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { User } from 'src/iam/users/domain/user.entity';
import { GetOrgAdminsUseCase } from 'src/iam/users/application/use-cases/get-org-admins/get-org-admins.use-case';
import { GetOrgAdminsQuery } from 'src/iam/users/application/use-cases/get-org-admins/get-org-admins.query';
import {
  BudgetAlertNotification,
  OrgBudgetAlertNotification,
  TeamBudgetAlertNotification,
  UserBudgetAlertNotification,
} from 'src/iam/budget-alerts/domain/budget-alert-notification.entity';
import { BudgetAlertScope } from 'src/iam/budget-alerts/domain/value-objects/budget-alert-scope.enum';
import {
  collectCrossings,
  notificationKey,
  type BudgetCrossing,
} from 'src/iam/budget-alerts/application/utils/budget-alert-crossing';
import { BudgetAlertNotificationRepository } from 'src/iam/budget-alerts/application/ports/budget-alert-notification.repository';
import { BudgetWarningScope } from 'src/common/email-templates/domain/value-objects/budget-warning-scope.enum';
import { SendBudgetWarningEmailUseCase } from 'src/iam/budget-alerts/application/use-cases/send-budget-warning-email/send-budget-warning-email.use-case';
import { SendBudgetWarningEmailCommand } from 'src/iam/budget-alerts/application/use-cases/send-budget-warning-email/send-budget-warning-email.command';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedBudgetAlertError } from 'src/iam/budget-alerts/application/budget-alerts.errors';
import { ProcessBudgetAlertCrossingsQuery } from './process-budget-alert-crossings.query';

const SCOPE_TO_WARNING: Record<BudgetAlertScope, BudgetWarningScope> = {
  [BudgetAlertScope.ORG]: BudgetWarningScope.ORG,
  [BudgetAlertScope.USER]: BudgetWarningScope.USER,
  [BudgetAlertScope.TEAM]: BudgetWarningScope.TEAM,
};

@Injectable()
export class ProcessBudgetAlertCrossingsUseCase {
  private readonly logger = new Logger(ProcessBudgetAlertCrossingsUseCase.name);

  constructor(
    private readonly notificationRepository: BudgetAlertNotificationRepository,
    private readonly getOrgAdminsUseCase: GetOrgAdminsUseCase,
    private readonly sendBudgetWarningEmailUseCase: SendBudgetWarningEmailUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedBudgetAlertError)
  async execute(query: ProcessBudgetAlertCrossingsQuery): Promise<void> {
    this.logger.log({ orgId: query.orgId }, 'execute');

    const sentKeys = await this.loadSentKeys(query.orgId, query.periodStart);
    const crossings = collectCrossings(query.targets, sentKeys);
    if (crossings.length === 0) {
      return;
    }

    const admins = await this.getOrgAdminsUseCase.execute(
      new GetOrgAdminsQuery(query.orgId),
    );
    if (admins.length === 0) {
      this.logger.warn(
        {
          orgId: query.orgId,
          crossings: crossings.length,
        },
        'Budget crossing with no admins to notify',
      );
      return;
    }

    for (const crossing of crossings) {
      const delivered = await this.sendToAdmins(crossing, admins);
      if (delivered > 0) {
        await this.recordCrossing(query.orgId, query.periodStart, crossing);
      }
    }
  }

  private async loadSentKeys(
    orgId: UUID,
    periodStart: Date,
  ): Promise<Set<string>> {
    const sent = await this.notificationRepository.findByOrgAndPeriod(
      orgId,
      periodStart,
    );
    return new Set(
      sent.map((notification) =>
        notificationKey(
          notification.scope,
          notification.targetId,
          notification.threshold,
        ),
      ),
    );
  }

  private async sendToAdmins(
    crossing: BudgetCrossing,
    admins: User[],
  ): Promise<number> {
    let delivered = 0;
    for (const admin of admins) {
      try {
        await this.sendBudgetWarningEmailUseCase.execute(
          this.toEmailCommand(crossing, admin),
        );
        delivered += 1;
      } catch (error) {
        this.logger.error(
          {
            scope: crossing.target.scope,
            targetId: crossing.target.targetId,
            recipientId: admin.id,
            err: error as Error,
          },
          'Failed to send budget warning to admin',
        );
      }
    }
    return delivered;
  }

  private async recordCrossing(
    orgId: UUID,
    periodStart: Date,
    crossing: BudgetCrossing,
  ): Promise<void> {
    try {
      await this.notificationRepository.recordMany(
        crossing.recordThresholds.map((threshold) =>
          this.createNotification(orgId, periodStart, crossing, threshold),
        ),
      );
    } catch (error) {
      // A failed insert must not block the org's remaining crossings; the
      // already-delivered email may repeat next run (at-least-once delivery).
      this.logger.error(
        {
          orgId,
          scope: crossing.target.scope,
          targetId: crossing.target.targetId,
          err: error as Error,
        },
        'Failed to record budget alert crossing',
      );
    }
  }

  private createNotification(
    orgId: UUID,
    periodStart: Date,
    crossing: BudgetCrossing,
    threshold: number,
  ): BudgetAlertNotification {
    const params = {
      orgId,
      threshold,
      periodStart,
    };

    switch (crossing.target.scope) {
      case BudgetAlertScope.ORG:
        return new OrgBudgetAlertNotification(params);
      case BudgetAlertScope.USER:
        return new UserBudgetAlertNotification({
          ...params,
          userId: crossing.target.targetId,
        });
      case BudgetAlertScope.TEAM:
        return new TeamBudgetAlertNotification({
          ...params,
          teamId: crossing.target.targetId,
        });
    }
  }

  private toEmailCommand(
    crossing: BudgetCrossing,
    admin: User,
  ): SendBudgetWarningEmailCommand {
    return new SendBudgetWarningEmailCommand({
      recipientName: admin.name,
      recipientEmail: admin.email,
      scope: SCOPE_TO_WARNING[crossing.target.scope],
      targetId: crossing.target.targetId,
      targetName: crossing.target.name,
      threshold: crossing.emailThreshold,
    });
  }
}
