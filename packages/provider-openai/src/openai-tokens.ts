import {
  createTiktokenEstimator,
  estimatedTokens,
  type TokenEstimator,
  type TokenEncoding,
  DEFAULT_MIN_TOKENS_PER_IMAGE,
  DEFAULT_TOKENS_PER_IMAGE,
} from '@ayunis/inference';

// Chat messages are framed with a role and separators: three tokens each.
const TOKENS_PER_MESSAGE = 3;

// Images are sent at `detail: high`, which bounds their cost by OpenAI's
// published rules. Tile models bill a base plus a rate per 512 px tile of an
// image fitted into 2048 px with a 768 px short side, so one to eight tiles.
// Patch models bill 32 px patches up to a per-model budget, times a
// multiplier, so one patch and up. The ceiling keeps a request inside the
// context window; the floor is what a host may bill for an image whose real
// cost it never learns.
const tileCeiling = (base: number, perTile: number): number =>
  base + 8 * perTile;
const tileFloor = (base: number, perTile: number): number => base + perTile;
const patchCeiling = (budget: number, multiplier: number): number =>
  Math.ceil(budget * multiplier);
const patchFloor = (multiplier: number): number => Math.ceil(multiplier);

// Deprecated patch models (gpt-4.1-nano, o4-mini, gpt-5-mini, gpt-5-nano) no
// longer have a published budget; the largest published one is assumed.
const LARGEST_PATCH_BUDGET = 6_144;

// First match wins. GPT-4o mini bills about 33 times the GPT-4o rate and is
// the one model that has to be recognised by name.
interface ModelTokenProfile {
  readonly matches: RegExp;
  readonly encoding: TokenEncoding;
  readonly maxImageTokens: number;
  readonly minImageTokens: number;
}

const MODEL_PROFILES: readonly ModelTokenProfile[] = [
  {
    matches: /^gpt-4o-mini/i,
    encoding: 'o200k_base',
    maxImageTokens: tileCeiling(2_833, 5_667),
    minImageTokens: tileFloor(2_833, 5_667),
  },
  {
    matches: /^gpt-4\.1-nano/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(LARGEST_PATCH_BUDGET, 2.46),
    minImageTokens: patchFloor(2.46),
  },
  {
    matches: /^gpt-4\.1-mini/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(LARGEST_PATCH_BUDGET, 1.62),
    minImageTokens: patchFloor(1.62),
  },
  {
    matches: /^o4-mini/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(LARGEST_PATCH_BUDGET, 1.72),
    minImageTokens: patchFloor(1.72),
  },
  {
    matches: /^gpt-5-nano/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(LARGEST_PATCH_BUDGET, 1.5),
    minImageTokens: patchFloor(1.5),
  },
  {
    matches: /^(gpt-5-mini|gpt-5\.2)/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(LARGEST_PATCH_BUDGET, 1.2),
    minImageTokens: patchFloor(1.2),
  },
  {
    matches: /^(gpt-5\.[456]|gpt-6)/i,
    encoding: 'o200k_base',
    maxImageTokens: patchCeiling(2_500, 1.2),
    minImageTokens: patchFloor(1.2),
  },
  {
    matches: /^gpt-5(\.1)?(?![\d.])/i,
    encoding: 'o200k_base',
    maxImageTokens: tileCeiling(70, 140),
    minImageTokens: tileFloor(70, 140),
  },
  {
    matches: /^gpt-4(?![o.])/i,
    encoding: 'cl100k_base',
    maxImageTokens: tileCeiling(85, 170),
    minImageTokens: tileFloor(85, 170),
  },
  {
    matches: /^(gpt-3\.5|text-)/i,
    encoding: 'cl100k_base',
    maxImageTokens: DEFAULT_TOKENS_PER_IMAGE,
    minImageTokens: DEFAULT_MIN_TOKENS_PER_IMAGE,
  },
  {
    matches: /^gpt-4/i,
    encoding: 'o200k_base',
    maxImageTokens: tileCeiling(85, 170),
    minImageTokens: tileFloor(85, 170),
  },
  {
    matches: /^o[13](?!\d)/i,
    encoding: 'o200k_base',
    maxImageTokens: tileCeiling(75, 150),
    minImageTokens: tileFloor(75, 150),
  },
];

// A name no rule recognises (typically an Azure deployment) gets the largest
// supported ceiling, so the budget over-counts it, and the cheapest supported
// floor, so billing under-counts it.
const UNKNOWN_MODEL_TOKENS_PER_IMAGE = Math.max(
  ...MODEL_PROFILES.map((profile) => profile.maxImageTokens),
);
const UNKNOWN_MODEL_MIN_TOKENS_PER_IMAGE = Math.min(
  ...MODEL_PROFILES.map((profile) => profile.minImageTokens),
);

const findProfile = (model: string): ModelTokenProfile | undefined =>
  MODEL_PROFILES.find((profile) => profile.matches.test(model));

export const openAITokensPerImage = (model: string): number =>
  findProfile(model)?.maxImageTokens ?? UNKNOWN_MODEL_TOKENS_PER_IMAGE;

export const openAIMinTokensPerImage = (model: string): number =>
  findProfile(model)?.minImageTokens ?? UNKNOWN_MODEL_MIN_TOKENS_PER_IMAGE;

export const openAITokens = (model: string): TokenEstimator => {
  const profile = findProfile(model);
  return createTiktokenEstimator({
    encoding: profile?.encoding ?? 'o200k_base',
    exact: profile !== undefined,
    tokensPerMessage: TOKENS_PER_MESSAGE,
    tokensPerImage: profile?.maxImageTokens ?? UNKNOWN_MODEL_TOKENS_PER_IMAGE,
    minTokensPerImage:
      profile?.minImageTokens ?? UNKNOWN_MODEL_MIN_TOKENS_PER_IMAGE,
  });
};

/**
 * A compatible endpoint serves models whose tokenizer and image pricing are
 * not OpenAI's, so it only gets the shared estimate.
 */
export const compatibleEndpointTokens = (): TokenEstimator => estimatedTokens();
