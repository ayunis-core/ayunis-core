import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from 'src/common/errors/base.error';
import { SetInitialPasswordTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { RenderTemplateCommand } from 'src/common/email-templates/application/use-cases/render-template/render-template.command';
import { SendEmailCommand } from 'src/common/emails/application/use-cases/send-email/send-email.command';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import { SendSetInitialPasswordEmailCommand } from './send-set-initial-password-email.command';
import { PasswordResetEmailSendingFailedError } from 'src/iam/users/application/users.errors';

@Injectable()
export class SendSetInitialPasswordEmailUseCase {
  private readonly logger = new Logger(SendSetInitialPasswordEmailUseCase.name);

  constructor(
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly configService: ConfigService,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
    private readonly findOrgByIdUseCase: FindOrgByIdUseCase,
  ) {}

  async execute(command: SendSetInitialPasswordEmailCommand): Promise<void> {
    this.logger.log({ email: command.userEmail }, 'execute');
    try {
      await this.sendInitialPasswordEmail(command);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: command.userEmail,
        },
        'Error sending set-initial-password email',
      );
      throw new PasswordResetEmailSendingFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { email: command.userEmail },
      );
    }
  }

  private async sendInitialPasswordEmail(
    command: SendSetInitialPasswordEmailCommand,
  ): Promise<void> {
    const org = await this.findOrgByIdUseCase.execute(
      new FindOrgByIdQuery(command.orgId),
    );
    const template = this.buildTemplate(command, org.name);
    const emailContent = this.renderTemplateUseCase.execute(
      new RenderTemplateCommand(template),
    );
    await this.sendEmailUseCase.execute(
      new SendEmailCommand({
        to: command.userEmail,
        subject: `Ihr Konto bei ${org.name} – Passwort festlegen`,
        html: emailContent.html,
        text: emailContent.text,
      }),
    );
    this.logger.debug(
      { email: command.userEmail },
      'Set-initial-password email sent',
    );
  }

  private buildTemplate(
    command: SendSetInitialPasswordEmailCommand,
    orgName: string,
  ): SetInitialPasswordTemplate {
    const frontendBaseUrl = this.configService.get<string>(
      'app.frontend.baseUrl',
    );
    const accountActivateEndpoint = this.configService.get<string>(
      'app.frontend.accountActivateEndpoint',
    );
    const emailAssetsPath = this.configService.get<string>(
      'app.frontend.emailAssetsPath',
    );
    const assetBase = `${frontendBaseUrl}${emailAssetsPath}`;
    return new SetInitialPasswordTemplate({
      resetUrl: `${frontendBaseUrl}${accountActivateEndpoint}?token=${command.resetToken}`,
      userEmail: command.userEmail,
      invitingCompanyName: orgName,
      userName: command.userName,
      productName: 'Ayunis Core',
      currentYear: new Date().getFullYear().toString(),
      logoUrl: `${assetBase}/logo.png`,
      teamUrl: `${assetBase}/team.png`,
      bannerUrl: `${assetBase}/banner-welcome.png`,
    });
  }
}
