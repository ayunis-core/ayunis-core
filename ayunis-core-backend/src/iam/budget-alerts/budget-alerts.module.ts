import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CreditLimitsModule } from '../credit-limits/credit-limits.module';
import { UsageModule } from '../../domain/usage/usage.module';
import { EmailsModule } from '../../common/emails/emails.module';
import { EmailTemplatesModule } from '../../common/email-templates/email-templates.module';

import { BudgetAlertNotificationRepository } from './application/ports/budget-alert-notification.repository';
import { LocalBudgetAlertNotificationRepository } from './infrastructure/persistence/local/local-budget-alert-notification.repository';
import {
  BudgetAlertNotificationRecord,
  OrgBudgetAlertNotificationRecord,
  TeamBudgetAlertNotificationRecord,
  UserBudgetAlertNotificationRecord,
} from './infrastructure/persistence/local/schema/budget-alert-notification.record';
import { BudgetAlertNotificationMapper } from './infrastructure/persistence/local/mappers/budget-alert-notification.mapper';
import { SendBudgetWarningEmailUseCase } from './application/use-cases/send-budget-warning-email/send-budget-warning-email.use-case';
import { EvaluateBudgetAlertsForOrgUseCase } from './application/use-cases/evaluate-budget-alerts-for-org/evaluate-budget-alerts-for-org.use-case';
import { GetBudgetAlertTargetsForOrgUseCase } from './application/use-cases/get-budget-alert-targets-for-org/get-budget-alert-targets-for-org.use-case';
import { ProcessBudgetAlertCrossingsUseCase } from './application/use-cases/process-budget-alert-crossings/process-budget-alert-crossings.use-case';
import { CleanupBudgetAlertNotificationsUseCase } from './application/use-cases/cleanup-budget-alert-notifications/cleanup-budget-alert-notifications.use-case';
import { BudgetAlertCleanupTask } from './application/tasks/budget-alert-cleanup.task';
import { BudgetAlertsListener } from './application/listeners/budget-alerts.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetAlertNotificationRecord,
      OrgBudgetAlertNotificationRecord,
      UserBudgetAlertNotificationRecord,
      TeamBudgetAlertNotificationRecord,
    ]),
    UsersModule,
    SubscriptionsModule,
    CreditLimitsModule,
    UsageModule,
    EmailsModule,
    EmailTemplatesModule,
  ],
  providers: [
    {
      provide: BudgetAlertNotificationRepository,
      useClass: LocalBudgetAlertNotificationRepository,
    },
    BudgetAlertNotificationMapper,
    SendBudgetWarningEmailUseCase,
    GetBudgetAlertTargetsForOrgUseCase,
    ProcessBudgetAlertCrossingsUseCase,
    EvaluateBudgetAlertsForOrgUseCase,
    CleanupBudgetAlertNotificationsUseCase,
    BudgetAlertCleanupTask,
    BudgetAlertsListener,
  ],
})
export class BudgetAlertsModule {}
