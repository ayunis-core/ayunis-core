import type {
  ModelMode,
  OnboardingStage,
  OnboardingStageResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type ChatModel = { modelId: string } | { mode: ModelMode };

export interface OnboardingChat {
  stage: OnboardingStage;
  model: ChatModel;
  isAnonymous: boolean;
}

export function composerChatModel(
  resolvedModelId: string | undefined,
  mode: ModelMode | null,
): ChatModel | null {
  if (!resolvedModelId) return null;
  return mode ? { mode } : { modelId: resolvedModelId };
}

/**
 * The chat the onboarding hint starts, or null when no hint applies. A profile
 * chat writes memory, which an anonymous chat or a model without memory access
 * doesn't have, so it ignores the composer's choices.
 */
export function onboardingChat(
  { stage, modelId }: OnboardingStageResponseDto,
  composer: { model: ChatModel | null; isAnonymous: boolean },
): OnboardingChat | null {
  if (stage === 'profile') {
    return modelId ? { stage, model: { modelId }, isAnonymous: false } : null;
  }
  if (stage === 'first_skill' && composer.model) {
    return { stage, model: composer.model, isAnonymous: composer.isAnonymous };
  }
  return null;
}
