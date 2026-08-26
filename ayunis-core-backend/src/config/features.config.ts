import { registerAs } from '@nestjs/config';

export enum FeatureFlag {
  KnowledgeBases = 'knowledgeBasesEnabled',
  Letterheads = 'letterheadsEnabled',
  Skills = 'skillsEnabled',
  Workspaces = 'workspacesEnabled',
  AgentRuntime = 'agentRuntimeEnabled',
  DeferredToolLoading = 'deferredToolLoadingEnabled',
  SsoLogin = 'ssoLoginEnabled',
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

export const featuresConfig = registerAs('features', (): FeaturesConfig => ({
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
  // Workspaces ("Projekte") group chats into folders. Off until the six-iteration
  // rollout is far enough along to expose (AYC-700).
  workspacesEnabled: parseBooleanWithDefault(
    process.env.FEATURE_WORKSPACES_ENABLED,
    false,
  ),
  // Routes runs through the extracted @ayunis/agent-runtime loop instead of the
  // legacy in-module loop. Off by default while the runtime path reaches parity
  // (AYC-148).
  agentRuntimeEnabled: parseBooleanWithDefault(
    process.env.FEATURE_AGENT_RUNTIME_ENABLED,
    false,
  ),
  deferredToolLoadingEnabled: parseBooleanWithDefault(
    process.env.FEATURE_DEFERRED_TOOL_LOADING_ENABLED,
    false,
  ),
  ssoLoginEnabled: parseBooleanWithDefault(
    process.env.FEATURE_SSO_LOGIN_ENABLED,
    false,
  ),
}));
