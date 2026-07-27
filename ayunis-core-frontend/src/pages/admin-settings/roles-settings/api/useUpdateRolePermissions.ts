import {
  useRolePermissionsControllerUpdate,
  getRolePermissionsControllerGetQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import type { RolePermissionsDraft } from '../model/types';
import {
  changedRoles,
  hasEmptyRoleSelection,
} from '../lib/role-permissions-draft';

interface UseUpdateRolePermissionsOptions {
  // Called when the draft is no longer needed: on a successful save and when
  // there was nothing to save. NOT called on failure, so in-progress edits
  // survive for a retry.
  onSaved?: () => void;
}

export function useUpdateRolePermissions(
  options?: UseUpdateRolePermissionsOptions,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-roles');
  const mutation = useRolePermissionsControllerUpdate();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: getRolePermissionsControllerGetQueryKey(),
    });

  async function save(
    rows: RolePermissionsDraft,
    serverDraft: RolePermissionsDraft,
  ): Promise<void> {
    if (hasEmptyRoleSelection(rows)) {
      showError(t('minOnePermission'));
      return;
    }
    const changed = changedRoles(rows, serverDraft);
    // Toggles were reverted to the saved state — nothing to send, so just drop
    // the draft without claiming a save happened.
    if (changed.length === 0) {
      options?.onSaved?.();
      return;
    }
    try {
      for (const role of changed) {
        await mutation.mutateAsync({
          role,
          data: { permissions: [...rows[role]] },
        });
      }
      // Refetch is awaited before dropping the draft so the matrix never
      // flashes stale checkboxes before the fresh data lands.
      await invalidate();
      options?.onSaved?.();
      showSuccess(t('saveSuccess'));
    } catch {
      // A role may have persisted before a later one failed, so refresh the
      // cache — but KEEP the draft (no onSaved) so the admin's in-progress edits
      // survive. On retry, changedRoles narrows to the roles that still differ.
      await invalidate();
      showError(t('saveError'));
    }
  }

  return { save, isSaving: mutation.isPending };
}
