import { Injectable } from '@nestjs/common';
import { SendEmailCommand } from './send-email.command';
import type { EmailDeliveryReceipt } from 'src/common/emails/application/models/email-delivery-receipt';
import { EmailSendFailedError } from 'src/common/emails/application/emails.errors';
import { EmailHandlerPort } from 'src/common/emails/application/ports/email-handler.port';
import { Email } from 'src/common/emails/domain/email.entity';

@Injectable()
export class SendEmailUseCase {
  constructor(private readonly emailHandler: EmailHandlerPort) {}

  async execute(command: SendEmailCommand): Promise<EmailDeliveryReceipt> {
    try {
      const email = new Email({
        to: command.to,
        subject: command.subject,
        text: command.text,
        html: command.html,
      });
      return await this.emailHandler.sendEmail(email);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new EmailSendFailedError(error.message, {
          error: error,
        });
      }
      throw new EmailSendFailedError('Unknown error', {
        error: error,
      });
    }
  }
}
