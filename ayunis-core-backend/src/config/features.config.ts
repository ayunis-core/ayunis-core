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
  if (value === undefined) return defaultValue;
  return value === 'true';
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
