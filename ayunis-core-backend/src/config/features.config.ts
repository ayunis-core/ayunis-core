import { registerAs } from '@nestjs/config';

export enum FeatureFlag {
  FynnManagedSubscriptions = 'fynnManagedSubscriptionsEnabled',
}

export type FeaturesConfig = Record<FeatureFlag, boolean>;

export const parseBooleanWithDefault = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  // Treat unset and empty/whitespace as "use default" — copying .env.example
  // sets these to "" via dotenv, which must not flip a default-on flag off.
  if (value === undefined || value.trim() === '') return defaultValue;
  return value.trim() === 'true';
};

export const featuresConfig = registerAs('features', (): FeaturesConfig => ({
  fynnManagedSubscriptionsEnabled:
    process.env.APP_ENVIRONMENT === 'cloud' &&
    parseBooleanWithDefault(
      process.env.FEATURE_FYNN_MANAGED_SUBSCRIPTIONS_ENABLED,
      false,
    ),
}));
