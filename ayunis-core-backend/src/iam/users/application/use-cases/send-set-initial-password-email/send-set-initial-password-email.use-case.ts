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
import { PasswordResetEmailSendingFailedError } from '../../users.errors';

/**
 * Sends the "Konto aktivieren" email to a user whose account has just been
 * created on their behalf (admin / super-admin onboarding flow). Re-uses the
 * password-reset token mechanism so the existing /password/reset frontend
 * route can complete activation, but presents the email as a welcoming
 * first-step rather than a security action.
 */
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
    try {
      this.logger.log('execute', { email: command.userEmail });

      const org = await this.findOrgByIdUseCase.execute(
        new FindOrgByIdQuery(command.orgId),
      );

      const frontendBaseUrl = this.configService.get<string>(
        'app.frontend.baseUrl',
      );
      const passwordResetEndpoint = this.configService.get<string>(
        'app.frontend.passwordResetEndpoint',
      );
      const emailAssetsPath = this.configService.get<string>(
        'app.frontend.emailAssetsPath',
      );
      const resetUrl = `${frontendBaseUrl}${passwordResetEndpoint}?token=${command.resetToken}`;
      const assetBase = `${frontendBaseUrl}${emailAssetsPath}`;

      const template = new SetInitialPasswordTemplate({
        resetUrl,
        userEmail: command.userEmail,
        invitingCompanyName: org.name,
        userName: command.userName,
        productName: 'Ayunis Core',
        currentYear: new Date().getFullYear().toString(),
        logoUrl: `${assetBase}/logo.png`,
        teamUrl: `${assetBase}/team.png`,
        bannerUrl: `${assetBase}/banner-welcome.png`,
      });

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

      this.logger.debug('Set-initial-password email sent', {
        email: command.userEmail,
      });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error sending set-initial-password email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: command.userEmail,
      });
      throw new PasswordResetEmailSendingFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { email: command.userEmail },
      );
    }
  }
}
