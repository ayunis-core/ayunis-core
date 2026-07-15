import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SendEmailCommand } from './send-email.command';
import { EmailHandlerPort } from '../../ports/email-handler.port';
import { Email } from 'src/common/emails/domain/email.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  EmailSendFailedError,
  UnexpectedEmailError,
} from '../../emails.errors';

@Injectable()
export class SendEmailUseCase {
  constructor(private readonly emailHandler: EmailHandlerPort) {}

  @HandleUnexpectedErrors(UnexpectedEmailError)
  async execute(command: SendEmailCommand): Promise<void> {
    try {
      const email = new Email({
        to: command.to,
        subject: command.subject,
        text: command.text,
        html: command.html,
      });
      await this.emailHandler.sendEmail(email);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new EmailSendFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { error },
      );
    }
  }
}
