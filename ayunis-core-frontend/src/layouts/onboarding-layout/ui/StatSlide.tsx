import { useTranslation } from 'react-i18next';
import { useCountUp } from '../lib/useCountUp';
import { APPEAR_DELAY_MS, CUSTOMER_COUNT } from '../model/showcase-content';
import { TrustBadges } from './TrustBadges';

export function StatSlide({ active }: Readonly<{ active: boolean }>) {
  const { t } = useTranslation('auth');
  const count = useCountUp(CUSTOMER_COUNT, active, APPEAR_DELAY_MS);

  return (
    <div className="flex w-full -translate-y-8 flex-col items-center text-center">
      <span className="onboarding-rise text-8xl font-bold tabular-nums text-white [text-shadow:0_2px_20px_rgba(30,24,64,0.5)]">
        {count}
      </span>
      <p className="onboarding-rise mt-2 max-w-[26rem] text-2xl font-medium leading-snug text-white [animation-delay:140ms] [text-shadow:0_1px_10px_rgba(30,24,64,0.45)]">
        {t('onboardingLayout.statTrustedText')}
      </p>
      <div className="onboarding-fade mt-8 [animation-delay:320ms]">
        <TrustBadges />
      </div>
    </div>
  );
}
