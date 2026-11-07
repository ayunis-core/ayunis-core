import { registerAs } from '@nestjs/config';
import { releaseNotesConfig } from './release-notes.config';

export enum FeatureFlag {
  ExternalSubscriptions = 'externalSubscriptionsEnabled',
  Routines = 'routinesEnabled',
  /** Release notes arrive in the routines' inbox, so they need both. */
  ReleaseNotes = 'releaseNotesEnabled',
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

export const featuresConfig = registerAs('features', (): FeaturesConfig => {
  const routinesEnabled = parseBooleanWithDefault(
    process.env.FEATURE_ROUTINES_ENABLED,
    false,
  );
  return {
    externalSubscriptionsEnabled:
      process.env.APP_ENVIRONMENT === 'cloud' &&
      parseBooleanWithDefault(
        process.env.FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED,
        false,
      ),
    routinesEnabled,
    releaseNotesEnabled:
      routinesEnabled && releaseNotesConfig().announcableOrgId !== null,
  };
});
