import type { CreateLanguageModelRequestDto } from '@/shared/api';
import type { LanguageModelFormData } from '@/pages/super-admin-settings/models-catalog/model/types';

export function normalizeLanguageModelFormData(
  data: LanguageModelFormData,
): CreateLanguageModelRequestDto {
  const { contextWindowSize } = data;
  // The form's required rule blocks submission before this point.
  if (contextWindowSize === undefined) {
    throw new Error('Context window size is required');
  }
  return {
    ...data,
    contextWindowSize,
    description: data.description?.trim() || undefined,
  };
}
