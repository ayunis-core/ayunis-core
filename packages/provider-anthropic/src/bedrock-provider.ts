import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';

import type { ModelProvider } from '@ayunis/inference';

import {
  createMessagesProvider,
  DEFAULT_MAX_TOKENS,
} from './anthropic-provider';

const DEFAULT_AWS_REGION = 'eu-central-1';

export interface BedrockProviderOptions {
  /** Bedrock model id, e.g. 'anthropic.claude-sonnet-4-20250514-v1:0'. */
  model: string;
  /** AWS region. Default: 'eu-central-1'. */
  awsRegion?: string;
  /** Static AWS access key. Omit both keys to use the AWS credential chain. */
  awsAccessKey?: string;
  /** Static AWS secret key. Omit both keys to use the AWS credential chain. */
  awsSecretKey?: string;
  maxTokens?: number;
  /** SDK-level retry count for transient failures. Default: 2. */
  maxRetries?: number;
}

/**
 * Anthropic-on-Bedrock ModelProvider. Same Messages protocol as `anthropic`,
 * so it reuses the request/chunk converters; only the client differs. With
 * both static keys it uses them, otherwise it falls back to the AWS credential
 * provider chain (env, instance/task role, …).
 */
export const bedrock = (options: BedrockProviderOptions): ModelProvider => {
  const client = createBedrockClient(options);
  return createMessagesProvider(
    client,
    `bedrock:${options.model}`,
    options.model,
    options.maxTokens ?? DEFAULT_MAX_TOKENS,
  );
};

/**
 * Resolves the AWS region: an explicit option wins, then the standard AWS
 * region env vars, then the default — so a deployment configured purely via
 * the environment isn't silently pinned to eu-central-1.
 */
export const resolveAwsRegion = (
  region: string | undefined,
  env: Record<string, string | undefined> = process.env,
): string =>
  region ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? DEFAULT_AWS_REGION;

const createBedrockClient = (
  options: BedrockProviderOptions,
): AnthropicBedrock => {
  const awsRegion = resolveAwsRegion(options.awsRegion);
  const maxRetries =
    options.maxRetries !== undefined ? { maxRetries: options.maxRetries } : {};
  if (options.awsAccessKey && options.awsSecretKey) {
    return new AnthropicBedrock({
      awsRegion,
      awsAccessKey: options.awsAccessKey,
      awsSecretKey: options.awsSecretKey,
      ...maxRetries,
    });
  }
  return new AnthropicBedrock({ awsRegion, ...maxRetries });
};
