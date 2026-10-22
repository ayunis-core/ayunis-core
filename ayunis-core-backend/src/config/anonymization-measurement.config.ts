import { registerAs } from '@nestjs/config';

export const anonymizationMeasurementConfig = registerAs(
  'anonymizationMeasurement',
  () => ({
    key: process.env.ANONYMIZATION_MEASUREMENT_KEY ?? '',
    detectorVersion:
      process.env.ANONYMIZATION_MEASUREMENT_DETECTOR_VERSION ?? '',
    expiresAt: process.env.ANONYMIZATION_MEASUREMENT_EXPIRES_AT ?? '',
  }),
);
