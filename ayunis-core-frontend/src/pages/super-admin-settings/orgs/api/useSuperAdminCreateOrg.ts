import {
  useSuperAdminOrgsControllerCreateOrg,
  type CreateOrgRequestDto,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { getSuperAdminOrgsControllerGetAllOrgsQueryKey } from '@/shared/api';

interface UseSuperAdminCreateOrgOptions {
  onSuccessCallback?: () => void;
}

export function useSuperAdminCreateOrg(
  options?: UseSuperAdminCreateOrgOptions,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const createOrgMutation = useSuperAdminOrgsControllerCreateOrg({
    mutation: {
      onSuccess: () => {
        // Invalidate the orgs list query
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminOrgsControllerGetAllOrgsQueryKey(),
        });
        void router.invalidate();
        options?.onSuccessCallback?.();
      },
      onError: (err) => {
        console.error('Error creating organization', err);
      },
    },
  });

  function createOrg(data: CreateOrgRequestDto) {
    createOrgMutation.mutate({
      data,
    });
  }

  return {
    createOrg,
    isLoading: createOrgMutation.isPending,
    isError: createOrgMutation.isError,
    error: createOrgMutation.error,
  };
}
