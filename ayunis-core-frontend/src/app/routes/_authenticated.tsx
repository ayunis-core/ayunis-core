import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import {
  authenticationControllerMe,
  getAuthenticationControllerMeQueryKey,
} from '@/shared/api';
import { queryOptions } from '@tanstack/react-query';
import extractErrorData from '@/shared/api/extract-error-data';

const meQueryOptions = () =>
  queryOptions({
    queryKey: getAuthenticationControllerMeQueryKey(),
    queryFn: () => authenticationControllerMe(),
  });

export const Route = createFileRoute('/_authenticated')({
  component: Outlet,
  beforeLoad: async ({ context, context: { queryClient } }) => {
    try {
      const response = await queryClient.fetchQuery(meQueryOptions());
      if (!response.role) {
        throw new Error('User not found');
      }
      context.user = response;
    } catch (error) {
      try {
        const { code } = extractErrorData(error);
        if (code === 'EMAIL_NOT_VERIFIED') {
          throw redirect({
            to: '/email-confirm',
          });
        }

        throw redirect({
          to: '/login',
          search: {
            redirect: location.pathname,
          },
        });
      } catch (e) {
        // If extractErrorData threw (non-AxiosError), redirect to login anyway
        if (e instanceof Error && e.message.includes('redirect')) {
          throw e; // Re-throw redirect
        }
        throw redirect({
          to: '/login',
          search: {
            redirect: location.pathname,
          },
        });
      }
    }
  },
});
