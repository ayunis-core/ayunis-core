import type {
  DefaultModelSelectionResponseDto,
  PermittedLanguageModelResponseDto,
} from '@ayunis/api-client/schemas';
import { getModeValue } from './model-presentation/model-modes';

/** The composer value a new chat starts with: the user's default, else the org's default model, else the first. */
export function defaultComposerValue(
  selection: DefaultModelSelectionResponseDto | null | undefined,
  models: readonly PermittedLanguageModelResponseDto[],
): string | undefined {
  if (selection?.mode) return getModeValue(selection.mode);
  return (
    selection?.permittedModelId ??
    models.find(({ isDefault }) => isDefault)?.id ??
    models[0]?.id
  );
}
