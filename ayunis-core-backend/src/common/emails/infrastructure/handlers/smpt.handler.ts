import { Injectable } from '@nestjs/common';
import { EmailHandlerPort } from '../../application/ports/email-handler.port';
import { Email } from '../../domain/email.entity';
import nodemailer, { type Transporter } from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmptHandler implements EmailHandlerPort {
  private readonly transporter: Transporter;

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
  async sendEmail(email: Email): Promise<void> {
    await this.transporter.sendMail({
      from: 'Ayunis <noreply@mails.ayunis.com>',
      to: email.to,
      subject: email.subject,
      text: email.html ? '' : email.text,
      html: email.html,
    });
  }
}
