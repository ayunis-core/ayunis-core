import type { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { Email } from 'src/common/emails/domain/email.entity';
import { SmptHandler } from './smpt.handler';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('SmptHandler', () => {
  const sendMail = jest.fn();
  const createTransport = jest.mocked(nodemailer.createTransport);

  beforeEach(() => {
    jest.clearAllMocks();
    createTransport.mockReturnValue({ sendMail } as never);
  });

  it('returns the SMTP provider receipt', async () => {
    sendMail.mockResolvedValue({
      messageId: '<invite-123@mails.ayunis.com>',
      accepted: ['maria.muster@stadt-velburg.de'],
      rejected: [],
      pending: [],
      response: '250 2.0.0 message accepted for delivery',
    });
    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'emails.smtp.host': 'smtp.inxmail-commerce.com',
          'emails.smtp.port': 587,
          'emails.smtp.secure': false,
          'emails.smtp.requireTLS': true,
          'emails.smtp.user': 'ayunis',
          'emails.smtp.password': 'secret',
        };
        return values[key];
      }),
    };
    const handler = new SmptHandler(config as unknown as ConfigService);

    const receipt = await handler.sendEmail(
      new Email({
        to: 'maria.muster@stadt-velburg.de',
        subject: 'Einladung zu Stadt Velburg – Ayunis Core',
        text: 'Einladung',
        html: '<html>Einladung</html>',
      }),
    );

    expect(receipt).toEqual({
      messageId: '<invite-123@mails.ayunis.com>',
      acceptedRecipients: ['maria.muster@stadt-velburg.de'],
      rejectedRecipients: [],
      pendingRecipients: [],
      statusCode: 250,
    });
  });

  it('normalizes an omitted pending-recipient list', async () => {
    sendMail.mockResolvedValue({
      messageId: '<invite-456@mails.ayunis.com>',
      accepted: ['maria.muster@stadt-velburg.de'],
      rejected: [],
      response: '250 2.0.0 message accepted for delivery',
    });
    const config = { get: jest.fn() };
    const handler = new SmptHandler(config as unknown as ConfigService);

    const receipt = await handler.sendEmail(
      new Email({
        to: 'maria.muster@stadt-velburg.de',
        subject: 'Einladung zu Stadt Velburg – Ayunis Core',
        text: 'Einladung',
      }),
    );

    expect(receipt.pendingRecipients).toEqual([]);
  });

  it('does not expose a non-standard SMTP response', async () => {
    sendMail.mockResolvedValue({
      messageId: '<invite-789@mails.ayunis.com>',
      accepted: ['maria.muster@stadt-velburg.de'],
      rejected: [],
      response: 'recipient maria.muster@stadt-velburg.de accepted',
    });
    const config = { get: jest.fn() };
    const handler = new SmptHandler(config as unknown as ConfigService);

    const receipt = await handler.sendEmail(
      new Email({
        to: 'maria.muster@stadt-velburg.de',
        subject: 'Einladung zu Stadt Velburg – Ayunis Core',
        text: 'Einladung',
      }),
    );

    expect(receipt).toMatchObject({ statusCode: null });
    expect(receipt).not.toHaveProperty('response');
  });
});
