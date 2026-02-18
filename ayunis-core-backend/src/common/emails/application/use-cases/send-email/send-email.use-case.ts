import { Injectable } from '@nestjs/common';
import { SendEmailCommand } from './send-email.command';
import { EmailHandlerPort } from '../../ports/email-handler.port';
import { Email } from 'src/common/emails/domain/email.entity';
import { EmailSendFailedError } from '../../emails.errors';

@Injectable()
export class SendEmailUseCase {
  constructor(private readonly emailHandler: EmailHandlerPort) {}

  async execute(command: SendEmailCommand): Promise<void> {
    try {
      const email = new Email({
        to: command.to,
        subject: command.subject,
        text: command.text,
        html: command.html,
      });
      await this.emailHandler.sendEmail(email);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new EmailSendFailedError(error.message, {
          error,
        });
      }
      throw new EmailSendFailedError('Unknown error', {
        error,
      });
    }
  }
}
