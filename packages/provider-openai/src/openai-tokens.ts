import {
  createTiktokenEstimator,
  estimatedTokens,
  type TokenEstimator,
} from '@ayunis/inference';

// OpenAI publishes its encodings: cl100k_base for GPT-3.5 and GPT-4, o200k_base
// from GPT-4o on. Azure deployments carry custom names, so an unknown name is
// taken for a current model.
const CL100K_MODELS = /^(gpt-3\.5|gpt-4(?![o.])|text-)/i;

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
const IMAGE_CEILINGS: ReadonlyArray<readonly [RegExp, number]> = [
  [/^gpt-4o-mini/i, tileCeiling(2_833, 5_667)],
  [/^gpt-4\.1-nano/i, patchCeiling(LARGEST_PATCH_BUDGET, 2.46)],
  [/^gpt-4\.1-mini/i, patchCeiling(LARGEST_PATCH_BUDGET, 1.62)],
  [/^o4-mini/i, patchCeiling(LARGEST_PATCH_BUDGET, 1.72)],
  [/^gpt-5-nano/i, patchCeiling(LARGEST_PATCH_BUDGET, 1.5)],
  [/^(gpt-5-mini|gpt-5\.2)/i, patchCeiling(LARGEST_PATCH_BUDGET, 1.2)],
  [/^(gpt-5\.[456]|gpt-6)/i, patchCeiling(2_500, 1.2)],
  [/^gpt-5(\.1)?(?![\d.])/i, tileCeiling(70, 140)],
  [/^gpt-4/i, tileCeiling(85, 170)],
  [/^o[13](?!\d)/i, tileCeiling(75, 150)],
];

// A name no rule recognises (typically an Azure deployment) is over-counted
// rather than under-counted: it gets the largest ceiling among current models.
const UNKNOWN_MODEL_TOKENS_PER_IMAGE = patchCeiling(LARGEST_PATCH_BUDGET, 1.62);

export const openAITokensPerImage = (model: string): number =>
  IMAGE_CEILINGS.find(([pattern]) => pattern.test(model))?.[1] ??
  UNKNOWN_MODEL_TOKENS_PER_IMAGE;

export const openAITokens = (model: string): TokenEstimator =>
  createTiktokenEstimator({
    encoding: CL100K_MODELS.test(model) ? 'cl100k_base' : 'o200k_base',
    exact: true,
    tokensPerMessage: TOKENS_PER_MESSAGE,
    tokensPerImage: openAITokensPerImage(model),
  });

/**
 * A compatible endpoint serves models whose tokenizer and image pricing are
 * not OpenAI's, so it only gets the shared estimate.
 */
export const compatibleEndpointTokens = (): TokenEstimator => estimatedTokens();
