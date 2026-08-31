import { AccountSettingsPage } from '@/pages/settings/account-settings';
import { createFileRoute } from '@tanstack/react-router';
import {
  authenticationControllerMe,
  getAuthenticationControllerMeQueryKey,
  ssoLoginControllerDiscover,
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
    const sso = await ssoLoginControllerDiscover({
      email: data.email,
    }).catch(() => ({ available: false, orgId: undefined }));
    return {
      user: {
        name: data.name,
        email: data.email,
      },
      isSsoEnabled: sso.available && sso.orgId === data.orgId,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { user, isSsoEnabled } = Route.useLoaderData();
  return <AccountSettingsPage user={user} isSsoEnabled={isSsoEnabled} />;
}
