import { createFileRoute } from '@tanstack/react-router';
import ResetPasswordPage from '@/pages/auth/reset-password';
import { TokenExpiredPage } from '@/pages/auth/reset-password/ui/TokenExpiredPage';
import { z } from 'zod';
import { userControllerValidateResetToken } from '@/shared/api/generated/ayunisCoreAPI';

const searchSchema = z.object({
  token: z.string(),
});

export const Route = createFileRoute('/(onboarding)/password/reset')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { token } }) => {
    try {
      const isValid = await userControllerValidateResetToken({ token });
      return {
        token,
        isValid,
      };
    } catch {
      return {
        token,
        isValid: false,
      };
    }
  },
});

function RouteComponent() {
  const { token, isValid } = Route.useLoaderData();
  if (!isValid) {
    return <TokenExpiredPage />;
  }
  return <ResetPasswordPage token={token} />;
}
