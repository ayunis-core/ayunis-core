import { createFileRoute } from '@tanstack/react-router';
import ResetPasswordPage from '@/pages/auth/reset-password';
import { TokenExpiredPage } from '@/pages/auth/reset-password/ui/TokenExpiredPage';
import { z } from 'zod';
import { userControllerValidateResetToken } from '@/shared/api/generated/ayunisCoreAPI';

type TokenPurpose = 'activation' | 'reset';

const searchSchema = z.object({
  token: z.string(),
});

export const Route = createFileRoute('/(onboarding)/password/reset')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { token } }) => {
    try {
      const result = await userControllerValidateResetToken({ token });
      const { valid, purpose } = result as unknown as {
        valid: boolean;
        purpose: TokenPurpose | null;
      };
      return { token, isValid: valid, purpose: purpose ?? 'reset' };
    } catch {
      return { token, isValid: false, purpose: 'reset' as TokenPurpose };
    }
  },
});

function RouteComponent() {
  const { token, isValid, purpose } = Route.useLoaderData();
  if (!isValid) {
    return <TokenExpiredPage purpose={purpose} />;
  }
  return <ResetPasswordPage token={token} purpose={purpose} />;
}
