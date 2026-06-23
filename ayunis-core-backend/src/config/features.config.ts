import { registerAs } from '@nestjs/config';

export enum FeatureFlag {
  KnowledgeBases = 'knowledgeBasesEnabled',
  Letterheads = 'letterheadsEnabled',
  Skills = 'skillsEnabled',
}

export type FeaturesConfig = Record<FeatureFlag, boolean>;

const parseBooleanWithDefault = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  // Treat unset and empty/whitespace as "use default" — copying .env.example
  // sets these to "" via dotenv, which must not flip a default-on flag off.
  if (value === undefined || value.trim() === '') return defaultValue;
  return value.trim() === 'true';
};

export const featuresConfig = registerAs(
  'features',
  (): FeaturesConfig => ({
    knowledgeBasesEnabled: parseBooleanWithDefault(
      process.env.FEATURE_KNOWLEDGE_BASES_ENABLED,
      true,
    ),
    letterheadsEnabled: parseBooleanWithDefault(
      process.env.FEATURE_LETTERHEADS_ENABLED,
      false,
    ),
    skillsEnabled: parseBooleanWithDefault(
      process.env.FEATURE_SKILLS_ENABLED,
      false,
    ),
  }),
);
