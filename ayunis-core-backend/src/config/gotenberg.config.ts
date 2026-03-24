import { registerAs } from '@nestjs/config';

export interface GotenbergConfig {
  url: string;
}

export const gotenbergConfig = registerAs(
  'gotenberg',
  (): GotenbergConfig => ({
    url: process.env.GOTENBERG_URL || 'http://localhost:3000',
  }),
);
