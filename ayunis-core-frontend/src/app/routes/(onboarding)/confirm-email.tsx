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
      console.log(error);
      const { code } = extractErrorData(error);
      switch (code) {
        case 'EMAIL_NOT_VERIFIED':
          return redirect({ to: '/email-confirm' });
        default:
          throw error;
      }
    }
  },
  errorComponent: ({ error }) => {
    const { code } = extractErrorData(error);
    switch (code) {
      case 'INVALID_EMAIL_CONFIRMATION_TOKEN':
        return <EmailConfirmError />;
      default:
        throw error;
    }
  },
});
