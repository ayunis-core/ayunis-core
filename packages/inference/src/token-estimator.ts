import { get_encoding, type Tiktoken } from 'tiktoken';
import type { ToolSchema } from './tool-schema';

export type TokenEncoding = 'cl100k_base' | 'o200k_base';

export type ToolDescription = Readonly<ToolSchema>;

/**
 * How a provider counts a request, so a host can keep it inside the context
 * window. A provider with a public tokenizer counts exactly; the rest estimate.
 */
export interface TokenEstimator {
  /** Text counts match the provider's own tokenizer. */
  readonly exact: boolean;
  /** Framing tokens the provider adds around every message. */
  readonly tokensPerMessage: number;
  /** Fixed cost per image; estimators do not decode image bytes. */
  readonly tokensPerImage: number;
  countText(text: string): number;
  /** Estimates the serialized tool definitions; provider wire framing may differ. */
  countTools(tools: readonly ToolDescription[]): number;
}

export interface TiktokenEstimatorOptions {
  readonly encoding: TokenEncoding;
  readonly exact: boolean;
  readonly tokensPerMessage: number;
  readonly tokensPerImage: number;
}

// Anthropic's documented ceiling: images are scaled to about 1.15 megapixels,
// billed as roughly 1,600 tokens. It is the conservative default for every
// provider that does not state its own cost.
export const DEFAULT_TOKENS_PER_IMAGE = 1_600;

const encoders = new Map<TokenEncoding, Tiktoken>();

const encoderFor = (encoding: TokenEncoding): Tiktoken => {
  const existing = encoders.get(encoding);
  if (existing) return existing;
  const encoder = get_encoding(encoding);
  encoders.set(encoding, encoder);
  return encoder;
};

export const createTiktokenEstimator = (
  options: TiktokenEstimatorOptions,
): TokenEstimator => {
  const countText = (text: string): number =>
    text ? encoderFor(options.encoding).encode(text, [], []).length : 0;
  return {
    exact: options.exact,
    tokensPerMessage: options.tokensPerMessage,
    tokensPerImage: options.tokensPerImage,
    countText,
    countTools: (tools) =>
      tools.length === 0
        ? 0
        : countText(
            JSON.stringify(
              tools.map(({ name, description, parameters }) => ({
                name,
                description,
                parameters,
              })),
            ),
          ),
  };
};

/**
 * The estimate for providers that keep their tokenizer private: cl100k_base
 * text counts, no per-message framing, the default image cost. Hosts should
 * keep a margin on top of it.
 */
export const estimatedTokens = (): TokenEstimator =>
  createTiktokenEstimator({
    encoding: 'cl100k_base',
    exact: false,
    tokensPerMessage: 0,
    tokensPerImage: DEFAULT_TOKENS_PER_IMAGE,
  });
