import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(SendPasswordResetEmailUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly configService: ConfigService,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
  ) {}

  async execute(command: SendPasswordResetEmailCommand): Promise<void> {
    this.logger.info(
      { email: command.userEmail, hasUserName: !!command.userName },
      'execute',
    );
    try {
      await this.sendPasswordResetEmail(command);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: command.userEmail,
        },
        'Error sending password reset email',
      );
      throw new PasswordResetEmailSendingFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { email: command.userEmail },
      );
    }
  }

  private async sendPasswordResetEmail(
    command: SendPasswordResetEmailCommand,
  ): Promise<void> {
    const template = this.buildTemplate(command);
    const emailContent = this.renderTemplateUseCase.execute(
      new RenderTemplateCommand(template),
    );
    this.logger.debug(
      { email: command.userEmail },
      'Sending password reset email',
    );
    await this.sendEmailUseCase.execute(
      new SendEmailCommand({
        to: command.userEmail,
        subject: 'Passwort zurücksetzen für Ayunis Core',
        html: emailContent.html,
        text: emailContent.text,
      }),
    );
    this.logger.debug(
      { email: command.userEmail },
      'Password reset email sent successfully',
    );
  }

  private buildTemplate(
    command: SendPasswordResetEmailCommand,
  ): PasswordResetTemplate {
    const frontendBaseUrl = this.configService.get<string>(
      'app.frontend.baseUrl',
    );
    const passwordResetEndpoint = this.configService.get<string>(
      'app.frontend.passwordResetEndpoint',
    );
    const forgotPasswordEndpoint = this.configService.get<string>(
      'app.frontend.forgotPasswordEndpoint',
    );
    const emailAssetsPath = this.configService.get<string>(
      'app.frontend.emailAssetsPath',
    );
    const assetBase = `${frontendBaseUrl}${emailAssetsPath}`;
    this.logger.debug(
      { email: command.userEmail },
      'Creating password reset email template',
    );
    return new PasswordResetTemplate({
      resetUrl: `${frontendBaseUrl}${passwordResetEndpoint}?token=${command.resetToken}`,
      forgotPasswordUrl: `${frontendBaseUrl}${forgotPasswordEndpoint}`,
      userEmail: command.userEmail,
      companyName: 'Ayunis',
      productName: 'Ayunis Core',
      currentYear: new Date().getFullYear().toString(),
      userName: command.userName,
      logoUrl: `${assetBase}/logo.png`,
      teamUrl: `${assetBase}/team.png`,
    });
  }
}
