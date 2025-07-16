import { registerAs } from '@nestjs/config';

export const emailsConfig = registerAs('emails', () => ({
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
  },
}));
