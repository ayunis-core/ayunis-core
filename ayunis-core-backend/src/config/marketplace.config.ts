import { registerAs } from '@nestjs/config';

export const marketplaceConfig = registerAs('marketplace', () => ({
  serviceUrl: process.env.MARKETPLACE_SERVICE_URL || 'http://localhost:3002',
}));
