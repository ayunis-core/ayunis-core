// Utils
import React from 'react';
import { useTranslation } from 'react-i18next';

// UI
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';

// Static
import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import authBg from '@/shared/assets/brand/auth-bg.jpg';

interface OnboardingLayoutProps {
  children?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function OnboardingLayout({
  children,
  title,
  description,
  footer,
}: OnboardingLayoutProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 relative overflow-y-auto">
        <div className="absolute inset-0 h-full flex flex-col gap-4 justify-between px-4">
          <div>
            {/* Brand Logo */}
            <div className="mb-12 mt-24 text-center">
              <img
                src={brandFullLight}
                alt="Ayunis Core"
                className="h-12 mx-auto mb-4"
              />
            </div>

            {/* Form Card */}
            <Card className="border-0 shadow-none max-w-md mx-auto">
              <CardHeader className="space-y-1 px-0">
                <CardTitle className="text-2xl text-center font-semibold">
                  {title}
                </CardTitle>
                {description && (
                  <CardDescription className="text-center text-gray-600">
                    {description}
                  </CardDescription>
                )}
              </CardHeader>
              {children && (
                <CardContent className="px-0">{children}</CardContent>
              )}
              {footer && (
                <CardFooter className="flex items-center justify-center gap-2 text-sm">
                  {footer}
                </CardFooter>
              )}
            </Card>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <a
              href="https://www.ayunis.com/impressum"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('onboardingLayout.imprint')}
            </a>
            <a
              href="https://www.ayunis.com/datenschutz-core"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('onboardingLayout.privacy')}
            </a>
          </div>
        </div>
      </div>

      {/* Right side - Gradient background with chat mockup */}
      <div className="hidden lg:flex flex-1 p-4">
        <div
          className="flex flex-col flex-1 relative overflow-hidden h-full w-full rounded-xl"
          style={{
            backgroundImage: `url(${authBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Title Text */}
          <div className="flex justify-center my-auto translate-y-[90px]">
            <h2 className="flex flex-col items-center justify-center gap-2 max-w-[550px] mx-auto text-center text-3xl font-medium text-white">
              <span className="text-5xl font-bold">700</span>
              {t('onboardingLayout.statTrustedText')}
            </h2>
          </div>

          {/* Bottom text */}
          <div className="z-1 flex justify-center gap-15 mb-12">
            <div className="text-center">
              <i className="text-4xl">🇩🇪</i>
              <div className="text-lg font-medium text-white">
                {t('onboardingLayout.madeInGermany')}
              </div>
              <div className="text-lg font-medium text-muted-foreground">
                {t('onboardingLayout.headquarteredInMunich')}
              </div>
            </div>

            <div className="text-center">
              <i className="text-4xl">🇪🇺</i>
              <div className="text-lg font-medium text-white">
                {t('onboardingLayout.gdprCompliant')}
              </div>
              <div className="text-lg font-medium text-muted-foreground">
                {t('onboardingLayout.hostedInEurope')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
