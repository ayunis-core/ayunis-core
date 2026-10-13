import {
  createTiktokenEstimator,
  type TokenEstimator,
} from '@ayunis/inference';

// OpenAI publishes its encodings: cl100k_base for GPT-3.5 and GPT-4, o200k_base
// from GPT-4o on. Azure deployments carry custom names, so an unknown name is
// taken for a current model.
const CL100K_MODELS = /^(gpt-3\.5|gpt-4(?![o.])|text-)/i;

// Chat messages are framed with a role and separators: three tokens each.
const TOKENS_PER_MESSAGE = 3;

// Ceiling of OpenAI's high-detail image pricing (85 base plus 170 per 512 px
// tile of an image scaled into 2048 px with a 768 px short side).
const TOKENS_PER_IMAGE = 85 + 170 * 8;

export const openAITokens = (model: string): TokenEstimator =>
  createTiktokenEstimator({
    encoding: CL100K_MODELS.test(model) ? 'cl100k_base' : 'o200k_base',
    exact: true,
    tokensPerMessage: TOKENS_PER_MESSAGE,
    tokensPerImage: TOKENS_PER_IMAGE,
  });
