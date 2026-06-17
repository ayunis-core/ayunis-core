import { createFileRoute, redirect } from '@tanstack/react-router';
import { LetterheadsSettingsPage } from '@/pages/admin-settings/letterheads-settings';
import {
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/letterheads/',
)({
  component: LetterheadsSettingsPage,
  loader: async ({ context: { queryClient } }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.letterheadsEnabled) {
      throw redirect({ to: '/admin-settings' });
    }
  },
});
