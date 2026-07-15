import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { SendConfirmationEmailCommand } from './send-confirmation-email.command';
import { SendEmailCommand } from 'src/common/emails/application/use-cases/send-email/send-email.command';
import { EmailConfirmationJwtService } from '../../services/email-confirmation-jwt.service';
import { SendEmailUseCase } from 'src/common/emails/application/use-cases/send-email/send-email.use-case';
import { ConfigService } from '@nestjs/config';
import {
  UserEmailAlreadyVerifiedError,
  UserUnexpectedError,
} from '../../users.errors';
import { EmailConfirmationTemplate } from 'src/common/email-templates/domain/email-template.entity';
import { RenderTemplateUseCase } from 'src/common/email-templates/application/use-cases/render-template/render-template.use-case';
import { RenderTemplateCommand } from 'src/common/email-templates/application/use-cases/render-template/render-template.command';

@Injectable()
export class SendConfirmationEmailUseCase {
  private readonly logger = new Logger(SendConfirmationEmailUseCase.name);

  constructor(
    private readonly emailConfirmationJwtService: EmailConfirmationJwtService,
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly configService: ConfigService,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
  ) {}

  // Email generation combines user, template, and delivery context.
  // eslint-disable-next-line max-lines-per-function
  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: SendConfirmationEmailCommand): Promise<void> {
    const user = command.user;
    // Check if email is already verified
    if (user.emailVerified) {
      this.logger.debug('Email already verified, skipping resend', {
        userId: user.id,
        email: user.email,
      });
      throw new UserEmailAlreadyVerifiedError('Email already verified', {
        userId: user.id,
        email: user.email,
      });
    }

    // Generate new confirmation token
    this.logger.debug('Generating new email confirmation token', {
      userId: user.id,
    });
    const confirmationToken =
      this.emailConfirmationJwtService.generateEmailConfirmationToken({
        userId: user.id,
        email: user.email,
      });

    // Build confirmation link
    const frontendBaseUrl = this.configService.get<string>(
      'app.frontend.baseUrl',
    );
    const emailConfirmEndpoint = this.configService.get<string>(
      'app.frontend.emailConfirmEndpoint',
    );
    const confirmationLink = `${frontendBaseUrl}${emailConfirmEndpoint}?token=${confirmationToken}`;

    // Send email
    this.logger.debug('Resending email confirmation email', {
      userId: user.id,
      email: user.email,
    });
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

    this.logger.debug('Email confirmation resent successfully', {
      userId: user.id,
      email: user.email,
    });
  }
}
