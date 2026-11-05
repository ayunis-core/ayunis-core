import { createFileRoute } from '@tanstack/react-router';
import ResetPasswordPage from '@/pages/auth/reset-password';
import { TokenExpiredPage } from '@/pages/auth/reset-password/ui/TokenExpiredPage';
import { z } from 'zod';
import { userPasswordResetControllerValidateResetToken } from '@/shared/api/generated/ayunisCoreAPI';
import { searchParamString } from '@/shared/lib/search-params';

const searchSchema = z.object({
  token: searchParamString,
});

export const Route = createFileRoute('/(onboarding)/account/activate')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { token } }) => {
    try {
      const { valid } = await userPasswordResetControllerValidateResetToken({
        token,
      });
      return { token, isValid: valid ?? false };
    } catch {
      return { token, isValid: false };
    }
  },
});

function RouteComponent() {
  const { token, isValid } = Route.useLoaderData();
  if (!isValid) {
    return <TokenExpiredPage mode="activation" />;
  }
  return <ResetPasswordPage token={token} mode="activation" />;
}
