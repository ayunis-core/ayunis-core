import { registerAs } from '@nestjs/config';
import { releaseNotesConfig } from './release-notes.config';
import { SURFACE_REGISTRY, type SurfaceFeatureFlag } from './surface-registry';

export enum FeatureFlag {
  ExternalSubscriptions = 'externalSubscriptionsEnabled',
  Routines = 'routinesEnabled',
  Recordings = 'recordingsEnabled',
  /** Release notes arrive in the routines' inbox, so they need both. */
  ReleaseNotes = 'releaseNotesEnabled',
  /** Voice input and read-aloud both run on Mistral, so they need its key. */
  Voice = 'voiceEnabled',
  /**
   * Opt-in while Mistral TTS is a preview model, whose inputs Mistral may
   * train on regardless of opt-outs.
   */
  ReadAloud = 'readAloudEnabled',
  /** Off until released: the memory API and memory in chat runs. */
  Memory = 'memoryEnabled',
  /**
   * Off until released: the Connections admin settings, connector endpoints
   * and everything that syncs knowledge base sources through a connector.
   */
  Connectors = 'connectorsEnabled',
  /**
   * Off until released: the mirror of council information systems (OParl),
   * its sync schedule and the super-admin catalog.
   */
  Oparl = 'oparlEnabled',
}

type SurfaceFeatureName = NonNullable<
  (typeof SURFACE_REGISTRY)[keyof typeof SURFACE_REGISTRY]['featureFlag']
>['name'];

export type FeaturesConfig = Record<FeatureFlag | SurfaceFeatureName, boolean>;

export const parseBooleanWithDefault = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  // Treat unset and empty/whitespace as "use default" — copying .env.example
  // sets these to "" via dotenv, which must not flip a default-on flag off.
  if (value === undefined || value.trim() === '') return defaultValue;
  return value.trim() === 'true';
};

export function isSurfaceFeatureEnabled(
  feature: SurfaceFeatureFlag | null,
): boolean {
  return (
    feature === null ||
    parseBooleanWithDefault(process.env[feature.envKey], feature.defaultEnabled)
  );
}

export const featuresConfig = registerAs('features', (): FeaturesConfig => {
  const routinesEnabled = parseBooleanWithDefault(
    process.env.FEATURE_ROUTINES_ENABLED,
    false,
  );
  const voiceEnabled = Boolean(process.env.MISTRAL_API_KEY?.trim());
  return {
    externalSubscriptionsEnabled:
      process.env.APP_ENVIRONMENT === 'cloud' &&
      parseBooleanWithDefault(
        process.env.FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED,
        false,
      ),
    routinesEnabled,
    recordingsEnabled: parseBooleanWithDefault(
      process.env.FEATURE_RECORDINGS_ENABLED,
      false,
    ),
    releaseNotesEnabled:
      routinesEnabled && releaseNotesConfig().announcableOrgId !== null,
    voiceEnabled,
    readAloudEnabled:
      voiceEnabled &&
      parseBooleanWithDefault(process.env.FEATURE_READ_ALOUD_ENABLED, false),
    [SURFACE_REGISTRY.outlook.featureFlag.name]: isSurfaceFeatureEnabled(
      SURFACE_REGISTRY.outlook.featureFlag,
    ),
    memoryEnabled: parseBooleanWithDefault(
      process.env.FEATURE_MEMORY_ENABLED,
      false,
    ),
    connectorsEnabled: parseBooleanWithDefault(
      process.env.FEATURE_CONNECTORS_ENABLED,
      false,
    ),
    oparlEnabled: parseBooleanWithDefault(
      process.env.FEATURE_OPARL_ENABLED,
      false,
    ),
  };
});
