export type ModelErrorFallbackKey =
  'models.createError' | 'models.updateError' | 'models.deleteError';

type ModelErrorToastKey =
  | ModelErrorFallbackKey
  | 'models.alreadyExists'
  | 'models.notFound'
  | 'models.invalid'
  | 'models.providerNotSupported'
  | 'models.imageGenerationProviderNotSupported';

const MODEL_ERROR_TOAST_KEYS: Record<string, ModelErrorToastKey> = {
  MODEL_ALREADY_EXISTS: 'models.alreadyExists',
  MODEL_NOT_FOUND: 'models.notFound',
  MODEL_INVALID: 'models.invalid',
  VALIDATION_ERROR: 'models.invalid',
  MODEL_PROVIDER_NOT_SUPPORTED: 'models.providerNotSupported',
  IMAGE_GENERATION_MODEL_PROVIDER_NOT_SUPPORTED:
    'models.imageGenerationProviderNotSupported',
  MODEL_CREATION_FAILED: 'models.createError',
  MODEL_UPDATE_FAILED: 'models.updateError',
  MODEL_DELETION_FAILED: 'models.deleteError',
};

export function resolveModelErrorToastKey(
  code: string,
  fallbackKey: ModelErrorFallbackKey,
): ModelErrorToastKey {
  return MODEL_ERROR_TOAST_KEYS[code] ?? fallbackKey;
}
