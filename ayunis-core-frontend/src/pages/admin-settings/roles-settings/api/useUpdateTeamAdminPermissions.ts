import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getMyPermissionsControllerGetMineQueryKey,
  getTeamAdminPermissionsControllerGetQueryKey,
  useTeamAdminPermissionsControllerUpdate,
} from '@/shared/api';
import type { TeamAdminPermission } from '@/features/permissions';
import { showError, showSuccess } from '@/shared/lib/toast';

interface UseUpdateTeamAdminPermissionsOptions {
  onSaved?: () => void;
}

export function useUpdateTeamAdminPermissions(
  options?: UseUpdateTeamAdminPermissionsOptions,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-roles');
  const mutation = useTeamAdminPermissionsControllerUpdate();
  const [isSaving, setIsSaving] = useState(false);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: getTeamAdminPermissionsControllerGetQueryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: getMyPermissionsControllerGetMineQueryKey(),
      }),
    ]);

  async function save(permissions: ReadonlySet<TeamAdminPermission>) {
    setIsSaving(true);
    try {
      await mutation.mutateAsync({ data: { permissions: [...permissions] } });
      await invalidate();
      options?.onSaved?.();
      showSuccess(t('saveSuccess'));
    } catch {
      showError(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  }

  return { save, isSaving };
}
