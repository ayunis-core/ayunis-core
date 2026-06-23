import { useTranslation } from 'react-i18next';
import peoplePhoto from '@/shared/assets/brand/auth-people-stat.jpg';
import { CUSTOMER_COUNT } from '../model/showcase-content';
import { LogoMarquee } from './LogoMarquee';
import { ShowcaseSlider } from './ShowcaseSlider';

export function OnboardingShowcase() {
  const { t } = useTranslation('auth');

  return (
    <div
      aria-hidden="true"
      className="onboarding-aurora relative h-full w-full min-w-0 flex-1 overflow-hidden rounded-xl"
    >
      <div className="absolute inset-0">
        <img
          src={peoplePhoto}
          alt={t('onboardingLayout.imageAlt')}
          className="onboarding-kenburns h-full w-full object-cover"
        />
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center px-10">
        <ShowcaseSlider />
      </div>

      <div className="onboarding-rise absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 px-10 pb-10 [animation-delay:300ms]">
        <span className="text-sm font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.3)]">
          {t('onboardingLayout.logosCaption', { customers: CUSTOMER_COUNT })}
        </span>
        <LogoMarquee />
      </div>
    </div>
  );
}
