import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from 'src/common/errors/base.error';
import { BudgetWarningTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { RenderTemplateCommand } from 'src/common/email-templates/application/use-cases/render-template/render-template.command';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { SendEmailCommand } from 'src/common/emails/application/use-cases/send-email/send-email.command';
import { SendBudgetWarningEmailCommand } from './send-budget-warning-email.command';
import { BudgetWarningEmailSendingFailedError } from '../../credit-alerts.errors';

const numberFormat = new Intl.NumberFormat('de-DE');
const CREDIT_LIMITS_SETTINGS_PATH = '/admin-settings/usage';

@Injectable()
export class SendBudgetWarningEmailUseCase {
  private readonly logger = new Logger(SendBudgetWarningEmailUseCase.name);

  constructor(
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: SendBudgetWarningEmailCommand): Promise<void> {
    try {
      const template = this.buildTemplate(command);
      const content = this.renderTemplateUseCase.execute(
        new RenderTemplateCommand(template),
      );
      const percent = Math.round(command.percentUsed).toString();
      await this.sendEmailUseCase.execute(
        new SendEmailCommand({
          to: command.recipientEmail,
          subject: `Budgetwarnung: ${percent}% des Budgets verbraucht`,
          html: content.html,
          text: content.text,
        }),
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to send budget warning email', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new BudgetWarningEmailSendingFailedError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private buildTemplate(
    command: SendBudgetWarningEmailCommand,
  ): BudgetWarningTemplate {
    const frontendBaseUrl = this.configService.get<string>(
      'app.frontend.baseUrl',
    );
    const emailAssetsPath = this.configService.get<string>(
      'app.frontend.emailAssetsPath',
    );
    const assetBase = `${frontendBaseUrl}${emailAssetsPath}`;

    return new BudgetWarningTemplate({
      recipientName: command.recipientName,
      recipientEmail: command.recipientEmail,
      scope: command.scope,
      targetName: command.targetName,
      threshold: command.threshold.toString(),
      percentUsed: Math.round(command.percentUsed).toString(),
      creditsUsed: numberFormat.format(Math.round(command.creditsUsed)),
      monthlyCredits: numberFormat.format(Math.round(command.monthlyCredits)),
      productName: 'Ayunis Core',
      currentYear: new Date().getFullYear().toString(),
      logoUrl: `${assetBase}/logo.png`,
      teamUrl: `${assetBase}/team.png`,
      settingsUrl: `${frontendBaseUrl}${CREDIT_LIMITS_SETTINGS_PATH}`,
    });
  }
}
