import type { LanguageModelFormData } from '../model/types';

export function normalizeLanguageModelFormData(
  data: LanguageModelFormData,
): LanguageModelFormData {
  return { ...data, description: data.description?.trim() || undefined };
}
