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

// tiktoken's BPE is quadratic in the length of a single pre-token, so one long
// run (a 93k-space run in a stored tool result) blocked the event loop for
// seconds per count. Text is encoded in chunks of at most MAX_CHUNK_CHARS, so no
// pre-token can outgrow a chunk whatever characters it is made of. A chunk ends
// before a space that follows a non-space, where both encodings always start a
// new pre-token, so ordinary text counts exactly. A window without one is cut
// anyway and charged a token. BPE does not bound what such a cut does, so the
// count can still fall a fraction of a percent short; the budget's safety ratio
// absorbs that, and a provider's context-length rejection trims and retries.
const MAX_CHUNK_CHARS = 1_000;

// The pre-tokenizer splits on Unicode White_Space; JS \s misses U+0085 of it.
const isWhitespace = (char: string): boolean =>
  char === '\u0085' || /\s/u.test(char);

const exactCut = (text: string, start: number, end: number): number => {
  for (let cut = end; cut > start; cut -= 1) {
    if (text[cut] === ' ' && !isWhitespace(text[cut - 1] ?? '')) return cut;
  }
  return -1;
};

// Lengths are UTF-16 units; a cut inside a surrogate pair would hand tiktoken
// two lone surrogates.
const forcedCut = (text: string, end: number): number => {
  const code = text.charCodeAt(end - 1);
  return code >= 0xd800 && code <= 0xdbff ? end + 1 : end;
};

const countInChunks = (
  text: string,
  encode: (chunk: string) => number,
): number => {
  let total = 0;
  let start = 0;
  while (text.length - start > MAX_CHUNK_CHARS) {
    let cut = exactCut(text, start, start + MAX_CHUNK_CHARS);
    if (cut === -1) {
      cut = forcedCut(text, start + MAX_CHUNK_CHARS);
      total += 1;
    }
    total += encode(text.slice(start, cut));
    start = cut;
  }
  return total + encode(text.slice(start));
};

export const createTiktokenEstimator = (
  options: TiktokenEstimatorOptions,
): TokenEstimator => {
  const countText = (text: string): number =>
    text
      ? countInChunks(
          text,
          (chunk) => encoderFor(options.encoding).encode(chunk, [], []).length,
        )
      : 0;
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
