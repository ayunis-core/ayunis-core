import OnboardingLayout from '@/layouts/onboarding-layout';
import { Button } from '@/shared/ui/shadcn/button';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

interface InviteErrorPageProps {
  error: Error;
}

export default function InviteErrorPage({ error }: InviteErrorPageProps) {
  const { t } = useTranslation('auth');

  function getErrorMessage(error: Error) {
    try {
      const errorMessage: unknown = JSON.parse(error.message);
      if (Array.isArray(errorMessage)) {
        const errorItem: unknown = errorMessage.find(
          (m: { code?: string; path?: string[] }) =>
            m.code === 'invalid_type' && m.path?.includes('token'),
        );
        if (errorItem) {
          return t('inviteError.invalidInviteToken');
        }
      }
    } catch {
      return t('inviteError.unexpectedError');
    }
  }

  return (
    <OnboardingLayout
      title={t('inviteError.title')}
      description={t('inviteError.description')}
    >
      <div className="flex flex-col gap-4 items-center">
        <p className="text-center">{getErrorMessage(error)}</p>
        <div className="flex justify-center">
          <Link to="/">
            <Button variant="outline">{t('inviteError.backToHome')}</Button>
          </Link>
        </div>
      </div>
    </OnboardingLayout>
  );
}
