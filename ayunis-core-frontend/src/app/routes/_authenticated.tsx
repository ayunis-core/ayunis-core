import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import {
  authenticationControllerMe,
  getAuthenticationControllerMeQueryKey,
} from '@/shared/api';
import {
  appControllerIsCloud,
  getAppControllerIsCloudQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { queryOptions } from '@tanstack/react-query';
import extractErrorData from '@/shared/api/extract-error-data';
import { currentPathWithSearch } from '@/shared/lib/current-path-with-search';
import { setAppsignalTags, clearAppsignalTags } from '@/shared/lib/appsignal';

const meQueryOptions = () =>
  queryOptions({
    queryKey: getAuthenticationControllerMeQueryKey(),
    queryFn: () => authenticationControllerMe(),
  });

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
  beforeLoad: async ({ context: { queryClient } }) => {
    try {
      const user = await queryClient.fetchQuery(meQueryOptions());
      setAppsignalTags({ userId: user.id, orgId: user.orgId });
      await queryClient.fetchQuery({
        queryKey: getAppControllerIsCloudQueryKey(),
        queryFn: () => appControllerIsCloud(),
      });
      return { user };
    } catch (error) {
      clearAppsignalTags();
      try {
        const { code } = extractErrorData(error);
        if (code === 'IP_NOT_ALLOWED') {
          throw redirect({
            to: '/ip-blocked',
          });
        }
        if (code === 'EMAIL_NOT_VERIFIED') {
          throw redirect({
            to: '/email-confirm',
          });
        }

        throw redirect({
          to: '/login',
          search: {
            redirect: currentPathWithSearch(location),
          },
        });
      } catch (e) {
        if (isRedirect(e)) {
          throw e;
        }
        throw redirect({
          to: '/login',
          search: {
            redirect: currentPathWithSearch(location),
          },
        });
      }
    }
  },
});
