// Bedrock is a separate entry point (`@ayunis/provider-anthropic/bedrock`) so
// importing the Anthropic provider does not pull in `@anthropic-ai/bedrock-sdk`
// and the AWS client code at module load.
export { anthropic, type AnthropicProviderOptions } from './anthropic-provider';
