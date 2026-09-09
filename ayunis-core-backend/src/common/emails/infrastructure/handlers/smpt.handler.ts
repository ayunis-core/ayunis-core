import { Injectable } from '@nestjs/common';
import type { EmailDeliveryReceipt } from 'src/common/emails/application/models/email-delivery-receipt';
import { EmailHandlerPort } from 'src/common/emails/application/ports/email-handler.port';
import { Email } from 'src/common/emails/domain/email.entity';
import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmptHandler implements EmailHandlerPort {
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(configService: ConfigService) {
    const user = configService.get<string>('emails.smtp.user');
    const pass = configService.get<string>('emails.smtp.password');

    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('emails.smtp.host'),
      port: configService.get<number>('emails.smtp.port'),
      secure: configService.get<boolean>('emails.smtp.secure'),
      ...(user && pass ? { auth: { user, pass } } : {}),
      requireTLS: configService.get<boolean>('emails.smtp.requireTLS'),
    });
  }
  async sendEmail(email: Email): Promise<EmailDeliveryReceipt> {
    const receipt = await this.transporter.sendMail({
      from: 'Ayunis <noreply@mails.ayunis.com>',
      to: email.to,
      subject: email.subject,
      text: email.html ? '' : email.text,
      html: email.html,
    });
    return {
      messageId: receipt.messageId,
      acceptedRecipients: receipt.accepted.map(recipientAddress),
      rejectedRecipients: receipt.rejected.map(recipientAddress),
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Nodemailer omits pending for non-pooled SMTP responses.
      pendingRecipients: (receipt.pending ?? []).map(recipientAddress),
      statusCode: smtpStatusCode(receipt.response),
    };
  }
}

function recipientAddress(recipient: string | { address: string }): string {
  return typeof recipient === 'string' ? recipient : recipient.address;
}

function smtpStatusCode(response: string): number | null {
  const match = /^(\d{3})(?:\s|$)/.exec(response);
  return match ? Number(match[1]) : null;
}
