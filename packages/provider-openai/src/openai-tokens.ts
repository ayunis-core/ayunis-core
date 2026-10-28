import {
  createTiktokenEstimator,
  estimatedTokens,
  type TokenEstimator,
  type TokenEncoding,
  DEFAULT_TOKENS_PER_IMAGE,
} from '@ayunis/inference';

// Chat messages are framed with a role and separators: three tokens each.
const TOKENS_PER_MESSAGE = 3;

// Images are sent at `detail: high`, which bounds their cost by OpenAI's
// published rules. Tile models bill a base plus a rate per 512 px tile of an
// image fitted into 2048 px with a 768 px short side, so at most eight tiles.
// Patch models bill 32 px patches up to a per-model budget, times a multiplier.
const tileCeiling = (base: number, perTile: number): number =>
  base + 8 * perTile;
const patchCeiling = (budget: number, multiplier: number): number =>
  Math.ceil(budget * multiplier);

// Deprecated patch models (gpt-4.1-nano, o4-mini, gpt-5-mini, gpt-5-nano) no
// longer have a published budget; the largest published one is assumed.
const LARGEST_PATCH_BUDGET = 6_144;

// First match wins. GPT-4o mini bills about 33 times the GPT-4o rate and is
// the one model that has to be recognised by name.
interface ModelTokenProfile {
  readonly matches: RegExp;
  readonly encoding: TokenEncoding;
  readonly maxImageTokens: number;
}

const MODEL_PROFILES: readonly ModelTokenProfile[] = [
  {
    matches: /^gpt-4o-mini/i,
    encoding: 'o200k_base',
    maxImageTokens: tileCeiling(2_833, 5_667),
  },
  {
    matches: /^gpt-4\.1-nano/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(LARGEST_PATCH_BUDGET, 2.46),
  },
  {
    matches: /^gpt-4\.1-mini/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(LARGEST_PATCH_BUDGET, 1.62),
  },
  {
    matches: /^o4-mini/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(LARGEST_PATCH_BUDGET, 1.72),
  },
  {
    matches: /^gpt-5-nano/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(LARGEST_PATCH_BUDGET, 1.5),
  },
  {
    matches: /^(gpt-5-mini|gpt-5\.2)/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(LARGEST_PATCH_BUDGET, 1.2),
  },
  {
    matches: /^(gpt-5\.[456]|gpt-6)/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(2_500, 1.2),
  },
  {
    matches: /^gpt-5(\.1)?(?![\d.])/i,
    encoding: 'o200k_base',
    maxImageTokens: tileCeiling(70, 140),
  },
  {
    matches: /^gpt-4(?![o.])/i,
    encoding: 'cl100k_base',
    maxImageTokens: tileCeiling(85, 170),
  },
  {
    matches: /^(gpt-3\.5|text-)/i,
    encoding: 'cl100k_base',
    maxImageTokens: DEFAULT_TOKENS_PER_IMAGE,
  },
  {
    matches: /^gpt-4/i,
    encoding: 'o200k_base',
    maxImageTokens: tileCeiling(85, 170),
  },
  {
    matches: /^o[13](?!\d)/i,
    encoding: 'o200k_base',
    maxImageTokens: tileCeiling(75, 150),
  },
];

// A name no rule recognises (typically an Azure deployment) is over-counted
// rather than under-counted: it gets the largest supported ceiling.
const UNKNOWN_MODEL_TOKENS_PER_IMAGE = Math.max(
  ...MODEL_PROFILES.map((profile) => profile.maxImageTokens),
);

export const openAITokensPerImage = (model: string): number =>
  MODEL_PROFILES.find((profile) => profile.matches.test(model))
    ?.maxImageTokens ?? UNKNOWN_MODEL_TOKENS_PER_IMAGE;

export const openAITokens = (model: string): TokenEstimator => {
  const profile = MODEL_PROFILES.find((candidate) =>
    candidate.matches.test(model),
  );
  return createTiktokenEstimator({
    encoding: profile?.encoding ?? 'o200k_base',
    exact: profile !== undefined,
    tokensPerMessage: TOKENS_PER_MESSAGE,
    tokensPerImage: profile?.maxImageTokens ?? UNKNOWN_MODEL_TOKENS_PER_IMAGE,
  });
};

/**
 * A compatible endpoint serves models whose tokenizer and image pricing are
 * not OpenAI's, so it only gets the shared estimate.
 */
export const compatibleEndpointTokens = (): TokenEstimator => estimatedTokens();
