import { useQueryClient } from '@tanstack/react-query';
import {
  useSuperAdminPlatformConfigControllerSetCreditsPerEuro,
  getSuperAdminPlatformConfigControllerGetCreditsPerEuroQueryKey,
} from '@/shared/api';

export default function useSetCreditsPerEuro() {
  const queryClient = useQueryClient();

  const { mutate, isPending } =
    useSuperAdminPlatformConfigControllerSetCreditsPerEuro({
      mutation: {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey:
              getSuperAdminPlatformConfigControllerGetCreditsPerEuroQueryKey(),
          });
        },
      },
    });

  function setCreditsPerEuro(
    creditsPerEuro: number,
    options: {
      onSuccess: () => void;
      onError: () => void;
    },
  ) {
    mutate(
      { data: { creditsPerEuro } },
      {
        onSuccess: options.onSuccess,
        onError: options.onError,
      },
    );
  }

  return { mutate: setCreditsPerEuro, isPending };
}
