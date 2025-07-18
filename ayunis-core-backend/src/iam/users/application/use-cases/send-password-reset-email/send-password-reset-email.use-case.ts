import { Injectable, Logger } from '@nestjs/common';
import { SendPasswordResetEmailCommand } from './send-password-reset-email.command';
import { SendEmailCommand } from 'src/common/emails/application/use-cases/send-email/send-email.command';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from 'src/common/errors/base.error';
import { PasswordResetTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { RenderTemplateCommand } from 'src/common/email-templates/application/use-cases/render-template/render-template.command';
import { PasswordResetEmailSendingFailedError } from '../../users.errors';

@Injectable()
export class SendPasswordResetEmailUseCase {
  private readonly logger = new Logger(SendPasswordResetEmailUseCase.name);

  constructor(
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly configService: ConfigService,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
  ) {}

  async execute(command: SendPasswordResetEmailCommand): Promise<void> {
    try {
      this.logger.log('execute', {
        email: command.userEmail,
        hasUserName: !!command.userName,
      });

      // Build password reset link
      const frontendBaseUrl = this.configService.get<string>(
        'app.frontend.baseUrl',
      );
      const passwordResetEndpoint = this.configService.get<string>(
        'app.frontend.passwordResetEndpoint',
      );
      const resetUrl = `${frontendBaseUrl}${passwordResetEndpoint}?token=${command.resetToken}`;

      // Create password reset email template
      this.logger.debug('Creating password reset email template', {
        email: command.userEmail,
      });
      const template = new PasswordResetTemplate({
        resetUrl,
        userEmail: command.userEmail,
        companyName: 'Ayunis',
        productName: 'Ayunis Core',
        currentYear: new Date().getFullYear().toString(),
        userName: command.userName,
      });

      // Render email content
      const emailContent = this.renderTemplateUseCase.execute(
        new RenderTemplateCommand(template),
      );

      // Send the password reset email
      this.logger.debug('Sending password reset email', {
        email: command.userEmail,
      });
      await this.sendEmailUseCase.execute(
        new SendEmailCommand({
          to: command.userEmail,
          subject: 'Passwort zurücksetzen',
          html: emailContent.html,
          text: emailContent.text,
        }),
      );

      this.logger.debug('Password reset email sent successfully', {
        email: command.userEmail,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error sending password reset email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: command.userEmail,
      });
      throw new PasswordResetEmailSendingFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        {
          email: command.userEmail,
        },
      );
    }
  }
}
