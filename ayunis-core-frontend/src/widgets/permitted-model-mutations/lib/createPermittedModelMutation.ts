import type { ModelWithConfigResponseDto } from '@/shared/api';
import type { QueryClient } from '@tanstack/react-query';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

export interface OptimisticContext {
  previousData?: ModelWithConfigResponseDto[];
  queryKey: readonly unknown[];
}

/**
 * Prepares optimistic update: cancels queries, saves previous data,
 * applies the updater function, and returns rollback context.
 */
export async function prepareOptimisticUpdate(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  updater: (
    models: ModelWithConfigResponseDto[],
  ) => ModelWithConfigResponseDto[],
): Promise<OptimisticContext> {
  await queryClient.cancelQueries({ queryKey });

  const previousData =
    queryClient.getQueryData<ModelWithConfigResponseDto[]>(queryKey);

  queryClient.setQueryData<ModelWithConfigResponseDto[]>(queryKey, (old) => {
    if (!old) return old;
    return updater(old);
  });

  return { previousData, queryKey };
}

/**
 * Rolls back optimistic update from context.
 */
export function rollbackOptimisticUpdate(
  queryClient: QueryClient,
  context?: OptimisticContext,
): void {
  if (context?.previousData) {
    queryClient.setQueryData(context.queryKey, context.previousData);
  }
}

/**
 * Handles mutation errors: extracts error code, shows appropriate message,
 * and rolls back optimistic update.
 */
export function handleMutationError(
  error: unknown,
  queryClient: QueryClient,
  context: OptimisticContext | undefined,
  t: (key: string) => string,
  errorMap: Record<string, string>,
  defaultErrorKey: string,
): void {
  try {
    const { code } = extractErrorData(error);
    const messageKey = errorMap[code] ?? defaultErrorKey;
    showError(t(messageKey));
  } catch {
    showError(t(defaultErrorKey));
  }

  rollbackOptimisticUpdate(queryClient, context);
}
