import { LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  beginSso,
  showSsoConnectionUnavailable,
  useDiscoverSso,
} from '@/features/sso';
import OnboardingLayout from '@/layouts/onboarding-layout';

interface SsoStartPageProps {
  identifier: string;
}

const orgIdSchema = z.string().uuid();

export function SsoStartPage({ identifier }: Readonly<SsoStartPageProps>) {
  const { t } = useTranslation('auth');
  const { discover } = useDiscoverSso();

  useEffect(() => {
    if (orgIdSchema.safeParse(identifier).success) {
      beginSso(identifier);
      return;
    }

    let active = true;
    void discover(`sso@${identifier.trim().toLowerCase()}`)
      .then((result) => {
        if (!active) return;
        if (result.available && result.orgId) {
          beginSso(result.orgId);
          return;
        }
        showSsoConnectionUnavailable();
      })
      .catch(() => {
        if (active) showSsoConnectionUnavailable();
      });

    return () => {
      active = false;
    };
  }, [discover, identifier]);

  return (
    <OnboardingLayout
      title={t('sso.start.title')}
      description={t('sso.start.description')}
    >
      <LoaderCircle
        aria-label={t('sso.start.loading')}
        className="mx-auto size-8 animate-spin text-primary"
      />
    </OnboardingLayout>
  );
}
