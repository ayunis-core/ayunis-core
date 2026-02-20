import { createFileRoute, redirect } from '@tanstack/react-router';
import z from 'zod';
import { userControllerConfirmEmail } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import EmailConfirmError from '@/pages/auth/email-confirm/ui/EmailConfirmError';

const searchSchema = z.object({
  token: z.string(),
});

export const Route = createFileRoute('/(onboarding)/confirm-email')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { token } }) => {
    try {
      await userControllerConfirmEmail({ token });
      return redirect({ to: '/login', search: { emailVerified: true } });
    } catch (error) {
      console.error(error);
      try {
        const { code } = extractErrorData(error);
        if (code === 'EMAIL_NOT_VERIFIED') {
          return redirect({ to: '/email-confirm' });
        }
        throw error;
      } catch {
        // Non-AxiosError or extractErrorData threw - rethrow original error
        throw error;
      }
    }
  },
  errorComponent: ({ error }) => {
    try {
      const { code } = extractErrorData(error);
      if (code === 'INVALID_EMAIL_CONFIRMATION_TOKEN') {
        return <EmailConfirmError />;
      }
      throw error;
    } catch {
      // Non-AxiosError or extractErrorData threw - rethrow original error
      throw error;
    }
  },
});
