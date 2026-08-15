import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SendConfirmationEmailCommand } from './send-confirmation-email.command';
import { SendEmailCommand } from 'src/common/emails/application/use-cases/send-email/send-email.command';
import { EmailConfirmationJwtService } from '../../services/email-confirmation-jwt.service';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { ConfigService } from '@nestjs/config';
import {
  UserEmailAlreadyVerifiedError,
  UserUnexpectedError,
} from '../../users.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { EmailConfirmationTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { RenderTemplateCommand } from 'src/common/email-templates/application/use-cases/render-template/render-template.command';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class SendConfirmationEmailUseCase {
  constructor(
    @InjectPinoLogger(SendConfirmationEmailUseCase.name)
    private readonly logger: PinoLogger,
    private readonly emailConfirmationJwtService: EmailConfirmationJwtService,
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly configService: ConfigService,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
  ) {}

  async execute(command: SendConfirmationEmailCommand): Promise<void> {
    try {
      await this.sendConfirmationEmail(command.user);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error sending email confirmation',
      );
      throw new UserUnexpectedError(error as Error);
    }
  }

  private async sendConfirmationEmail(user: User): Promise<void> {
    this.assertEmailUnverified(user);
    const confirmationLink = this.buildConfirmationLink(user);
    this.logger.debug(
      { userId: user.id, email: user.email },
      'Resending email confirmation email',
    );
    const template = new EmailConfirmationTemplate({
      confirmationUrl: confirmationLink,
      userEmail: user.email,
      currentYear: new Date().getFullYear().toString(),
      companyName: 'Ayunis',
    });
    const emailContent = this.renderTemplateUseCase.execute(
      new RenderTemplateCommand(template),
    );
    await this.sendEmailUseCase.execute(
      new SendEmailCommand({
        to: user.email,
        subject: 'Ayunis Core – Bestätigen Sie Ihre E-Mail-Adresse',
        html: emailContent.html,
        text: emailContent.text,
      }),
    );
    this.logger.debug(
      { userId: user.id, email: user.email },
      'Email confirmation resent successfully',
    );
  }

  private assertEmailUnverified(user: User): void {
    if (!user.emailVerified) return;
    this.logger.debug(
      { userId: user.id, email: user.email },
      'Email already verified, skipping resend',
    );
    throw new UserEmailAlreadyVerifiedError('Email already verified', {
      userId: user.id,
      email: user.email,
    });
  }

  private buildConfirmationLink(user: User): string {
    this.logger.debug(
      { userId: user.id },
      'Generating new email confirmation token',
    );
    const token =
      this.emailConfirmationJwtService.generateEmailConfirmationToken({
        userId: user.id,
        email: user.email,
      });
    const frontendBaseUrl = this.configService.get<string>(
      'app.frontend.baseUrl',
    );
    const endpoint = this.configService.get<string>(
      'app.frontend.emailConfirmEndpoint',
    );
    return `${frontendBaseUrl}${endpoint}?token=${token}`;
  }
}
