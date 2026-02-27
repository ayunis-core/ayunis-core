import { registerAs } from '@nestjs/config';

export interface MetricsConfig {
  user: string | undefined;
  password: string | undefined;
}

export const metricsConfig = registerAs(
  'metrics',
  (): MetricsConfig => ({
    user: process.env.AYUNIS_METRICS_USER,
    password: process.env.AYUNIS_METRICS_PASSWORD,
  }),
);
