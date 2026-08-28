import { AccountSettingsPage } from '@/pages/settings/account-settings';
import { createFileRoute } from '@tanstack/react-router';
import {
  authenticationControllerMe,
  getAuthenticationControllerMeQueryKey,
} from '@/shared/api';
import { queryOptions } from '@tanstack/react-query';

export const Route = createFileRoute('/_authenticated/settings/account')({
  loader: async ({ context: { queryClient } }) => {
    const data = await queryClient.fetchQuery(
      queryOptions({
        queryKey: getAuthenticationControllerMeQueryKey(),
        queryFn: () => authenticationControllerMe(),
      }),
    );
    return {
      user: {
        name: data.name,
        email: data.email,
      },
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useLoaderData();
  return <AccountSettingsPage user={user} />;
}
