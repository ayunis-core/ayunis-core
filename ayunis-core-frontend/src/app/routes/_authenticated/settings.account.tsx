import { AccountSettingsPage } from '@/pages/settings/account-settings';
import { createFileRoute } from '@tanstack/react-router';
import {
  authenticationControllerMe,
  getAuthenticationControllerMeQueryKey,
} from '@/shared/api';
import { queryOptions } from '@tanstack/react-query';
import { ssoLoginControllerDiscover } from '@/shared/api/generated/ayunisCoreAPI';
import { z } from 'zod';
import { isSsoAvailableForOrg } from '@/features/sso';

export const Route = createFileRoute('/_authenticated/settings/account')({
  validateSearch: z.object({ ssoLinked: z.boolean().optional() }),
  loader: async ({ context: { queryClient } }) => {
    const data = await queryClient.fetchQuery(
      queryOptions({
        queryKey: getAuthenticationControllerMeQueryKey(),
        queryFn: () => authenticationControllerMe(),
      }),
    );
    const sso = await ssoLoginControllerDiscover({
      email: data.email,
    }).catch(() => ({ available: false }));
    return {
      user: {
        name: data.name,
        email: data.email,
      },
      ssoAvailable: isSsoAvailableForOrg(sso, data.orgId),
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { user, ssoAvailable } = Route.useLoaderData();
  const { ssoLinked } = Route.useSearch();
  return (
    <AccountSettingsPage
      user={user}
      ssoAvailable={ssoAvailable}
      ssoLinked={ssoLinked ?? false}
    />
  );
}
