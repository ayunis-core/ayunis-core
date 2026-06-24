// Separate entry point so consumers that only use the Anthropic provider don't
// load the Bedrock + AWS SDK. Import as `@ayunis/provider-anthropic/bedrock`.
export { bedrock, type BedrockProviderOptions } from './bedrock-provider';
