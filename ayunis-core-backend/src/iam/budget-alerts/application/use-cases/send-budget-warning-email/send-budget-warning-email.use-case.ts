import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { BudgetWarningTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { BudgetWarningScope } from 'src/common/email-templates/domain/value-objects/budget-warning-scope.enum';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { RenderTemplateCommand } from 'src/common/email-templates/application/use-cases/render-template/render-template.command';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { SendEmailCommand } from 'src/common/emails/application/use-cases/send-email/send-email.command';
import { SendBudgetWarningEmailCommand } from './send-budget-warning-email.command';
import {
  BudgetWarningEmailRenderingFailedError,
  BudgetWarningEmailSendingFailedError,
} from '../../budget-alerts.errors';

// Where an admin can act on the warning: org budgets are only visible on the
// usage page (raising them goes through the provider), team limits live on the
// team detail page, user limits on the users page.
const SETTINGS_PATH_BY_SCOPE: Record<
  BudgetWarningScope,
  (targetId: string) => string
> = {
  [BudgetWarningScope.ORG]: () => '/admin-settings/usage',
  [BudgetWarningScope.TEAM]: (targetId) => `/admin-settings/teams/${targetId}`,
  [BudgetWarningScope.USER]: () => '/admin-settings/users',
};

@Injectable()
export class SendBudgetWarningEmailUseCase {
  constructor(
    @InjectPinoLogger(SendBudgetWarningEmailUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(BudgetWarningEmailSendingFailedError)
  async execute(command: SendBudgetWarningEmailCommand): Promise<void> {
    this.logger.info({ scope: command.scope }, 'execute');

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
      settingsUrl: `${frontendBaseUrl}${SETTINGS_PATH_BY_SCOPE[command.scope](command.targetId)}`,
    });
  }
}
