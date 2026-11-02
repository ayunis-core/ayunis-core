import { useQueryClient } from '@tanstack/react-query';
import { useModelModes } from '@/features/useModelModes';
import {
  getModelModeDefaultsControllerGetDefaultSelectionQueryKey,
  type DefaultModelSelectionResponseDto,
} from '@/shared/api';
import { resolveSelectedModel } from '@/widgets/model-select-options/lib/model-modes';

/**
 * Resolves the composer value (a model id or `mode:<mode>`) to the model a
 * new chat will be bound to.
 */
export function useSelectedModel<T extends { id: string }>(
  value: string | undefined,
  models: T[],
  isAnonymous: boolean,
) {
  const { resolutions } = useModelModes();
  // Loaded by the chat route loaders before the composer renders.
  const defaultSelection =
    useQueryClient().getQueryData<DefaultModelSelectionResponseDto | null>(
      getModelModeDefaultsControllerGetDefaultSelectionQueryKey(),
    );
  return resolveSelectedModel(
    value,
    models,
    resolutions,
    isAnonymous,
    defaultSelection ?? undefined,
  );
}
