import type { Model } from 'src/domain/models/domain/model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';

// Ollama serves `num_ctx` tokens whatever the model itself supports, so the
// catalog value has to reach it. Without one, the provider keeps its 30k
// default rather than the 200k history fallback, which would overload the
// GPU (AYC-1257).
export function ollamaContextWindow(model: Model): number | undefined {
  return model instanceof LanguageModel ? model.contextWindowSize : undefined;
}
