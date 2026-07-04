import { useNavigate, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import OnboardingLayout from '@/layouts/onboarding-layout';
import {
  MfaEnrollmentPanel,
  RecoveryCodesPanel,
} from '@/widgets/mfa-enrollment';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { useMfaLoginEnroll } from '../api/useMfaLoginEnroll';
import { TwoFactorVerifyForm } from './TwoFactorVerifyForm';

interface Props {
  redirect?: string;
  enroll: boolean;
}

export function TwoFactorPage({ redirect, enroll }: Readonly<Props>) {
  const { t } = useTranslation('auth');
  const prefix = enroll ? 'twoFactor.enroll' : 'twoFactor.verify';

  return (
    <OnboardingLayout
      title={t(`${prefix}.title`)}
      description={t(`${prefix}.description`)}
      footer={
        <>
          {t('twoFactor.backToLogin')}{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            {t('twoFactor.signIn')}
          </Link>
        </>
      }
    >
      {enroll ? (
        <EnrollFlow redirect={redirect} />
      ) : (
        <TwoFactorVerifyForm redirect={redirect} />
      )}
    </OnboardingLayout>
  );
}

function EnrollFlow({ redirect }: Readonly<{ redirect?: string }>) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { setup, confirm, isConfirming, recoveryCodes, errorMessage } =
    useMfaLoginEnroll();

  if (recoveryCodes) {
    return (
      <RecoveryCodesPanel
        codes={recoveryCodes}
        continueLabel={t('twoFactor.enroll.continue')}
        onContinue={() => void navigate({ to: redirect || '/chat' })}
      />
    );
  }

  if (!setup) {
    return (
      <div className="space-y-4">
        <Skeleton className="mx-auto h-44 w-44" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <MfaEnrollmentPanel
      qrCodeDataUri={setup.qrCodeDataUri}
      secret={setup.secret}
      onConfirm={confirm}
      isConfirming={isConfirming}
      errorMessage={errorMessage}
    />
  );
}
