import { registerAs } from '@nestjs/config';

export interface GotenbergConfig {
  url: string;
  /**
   * Office conversions this process keeps in flight at Gotenberg. Each
   * Gotenberg replica converts one document at a time, so waiting here, where
   * no request timeout runs, beats waiting in Gotenberg's queue (AYC-1641).
   */
  maxConcurrentConversions: number;
}

export const gotenbergConfig = registerAs('gotenberg', (): GotenbergConfig => ({
  url: process.env.GOTENBERG_URL || 'http://localhost:3000',
  maxConcurrentConversions: parseInt(
    process.env.GOTENBERG_MAX_CONCURRENT_CONVERSIONS || '1',
    10,
  ),
}));
