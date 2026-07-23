import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { BudgetWarningTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { RenderTemplateCommand } from 'src/common/email-templates/application/use-cases/render-template/render-template.command';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { SendEmailCommand } from 'src/common/emails/application/use-cases/send-email/send-email.command';
import { SendBudgetWarningEmailCommand } from './send-budget-warning-email.command';
import {
  BudgetWarningEmailRenderingFailedError,
  BudgetWarningEmailSendingFailedError,
} from '../../budget-alerts.errors';

const CREDIT_LIMITS_SETTINGS_PATH = '/admin-settings/usage';

@Injectable()
export class SendBudgetWarningEmailUseCase {
  private readonly logger = new Logger(SendBudgetWarningEmailUseCase.name);

  constructor(
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(BudgetWarningEmailSendingFailedError)
  async execute(command: SendBudgetWarningEmailCommand): Promise<void> {
    this.logger.log('execute', { scope: command.scope });

    const template = this.buildTemplate(command);
    const content = this.renderTemplateUseCase.execute(
      new RenderTemplateCommand(template),
    );
    if (!content.subject) {
      throw new BudgetWarningEmailRenderingFailedError(
        'template rendered without a subject',
      );
    }
    await this.sendEmailUseCase.execute(
      new SendEmailCommand({
        to: command.recipientEmail,
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
    );
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
      productName: 'Ayunis Core',
      currentYear: new Date().getFullYear().toString(),
      logoUrl: `${assetBase}/logo.png`,
      teamUrl: `${assetBase}/team.png`,
      settingsUrl: `${frontendBaseUrl}${CREDIT_LIMITS_SETTINGS_PATH}`,
    });
  }
}
