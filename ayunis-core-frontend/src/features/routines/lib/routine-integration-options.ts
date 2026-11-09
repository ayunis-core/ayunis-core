import type { McpIntegration } from '@/features/routines/model/openapi';

export interface RoutineIntegrationOption {
  id: string;
  /** Null for a selected integration that is no longer available to the user. */
  name: string | null;
  connected: boolean;
}

/**
 * The available integrations, followed by selected ones that are no longer
 * available, so the user can still turn those off. Null until the available
 * integrations are known, since only then can a selected one be told apart
 * from an unavailable one.
 */
export function routineIntegrationOptions(
  available: McpIntegration[] | undefined,
  selectedIds: string[],
): RoutineIntegrationOption[] | null {
  if (!available) return null;
  const availableIds = new Set(available.map(({ id }) => id));
  return [
    ...available.map((integration) => ({
      id: integration.id,
      name: integration.name,
      connected: integration.userAuthorized !== false,
    })),
    ...selectedIds
      .filter((id) => !availableIds.has(id))
      .map((id) => ({ id, name: null, connected: false })),
  ];
}

/** An integration that cannot be used may only be turned off. */
export function canToggleIntegration(
  option: RoutineIntegrationOption,
  selected: boolean,
): boolean {
  return option.connected || selected;
}
