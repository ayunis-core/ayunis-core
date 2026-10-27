import { registerAs } from '@nestjs/config';

export const anonymizationMeasurementConfig = registerAs(
  'anonymizationMeasurement',
  () => ({
    key: process.env.ANONYMIZATION_MEASUREMENT_KEY ?? '',
    expiresAt: process.env.ANONYMIZATION_MEASUREMENT_EXPIRES_AT ?? '',
  }),
);
