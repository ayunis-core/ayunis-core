import { ArrowRight } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import brandFullDark from '@/shared/assets/brand/brand-full-dark.svg';
import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import { WELCOME_PERSON } from '@/pages/welcome-prototype/model/welcome-prototype';

export function WelcomeLogoIntro({
  onStart,
}: Readonly<{ onStart: () => void }>) {
  return (
    <section className="wp-intro wp-logo-intro">
      <div className="wp-wordmark">
        <img
          src={brandFullLight}
          alt="Ayunis Core"
          className="wp-wordmark__img dark:hidden"
        />
        <img
          src={brandFullDark}
          alt=""
          className="wp-wordmark__img hidden dark:block"
        />
      </div>
      <div className="wp-logo-intro__text">
        <h1 className="wp-logo-intro__title">
          Willkommen, {WELCOME_PERSON.fullName}
        </h1>
        <p className="wp-logo-intro__org">{WELCOME_PERSON.orgName}</p>
      </div>
      <div className="wp-logo-intro__action">
        <Button size="lg" onClick={onStart}>
          Jetzt starten
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
