import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/shadcn/utils';
import { useCountUp } from '../lib/useCountUp';
import { APPEAR_DELAY_MS, CUSTOMER_COUNT } from '../model/showcase-content';
import { TrustBadges } from './TrustBadges';

export function StatSlide({ active }: Readonly<{ active: boolean }>) {
  const { t } = useTranslation('auth');
  const count = useCountUp(CUSTOMER_COUNT, active, APPEAR_DELAY_MS);

  return (
    <div className="flex w-full -translate-y-8 flex-col items-center text-center">
      <span
        className={cn(
          'text-8xl font-bold tabular-nums text-white [text-shadow:0_2px_20px_rgba(30,24,64,0.5)]',
          active && 'onboarding-rise',
        )}
      >
        {count}
      </span>
      <p
        className={cn(
          'mt-2 max-w-[26rem] text-2xl font-medium leading-snug text-white [text-shadow:0_1px_10px_rgba(30,24,64,0.45)]',
          active && 'onboarding-rise [animation-delay:140ms]',
        )}
      >
        {t('onboardingLayout.statTrustedText')}
      </p>
      <div
        className={cn(
          'mt-8',
          active && 'onboarding-fade [animation-delay:320ms]',
        )}
      >
        <TrustBadges />
      </div>
    </div>
  );
}
