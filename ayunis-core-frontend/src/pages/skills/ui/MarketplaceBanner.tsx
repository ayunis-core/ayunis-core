import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { useSkillMarketplaceUrl } from '@/features/marketplace';
import marketplaceBanner from '@/pages/skills/assets/marketplace-banner.jpg';

export function MarketplaceBanner() {
  const { t } = useTranslation('skills');
  const marketplaceUrl = useSkillMarketplaceUrl();
  if (!marketplaceUrl) return null;

  return (
    <div
      className="group relative isolate mt-4 overflow-hidden rounded-xl p-5"
      data-testid="skills-marketplace-banner"
    >
      <img
        src={marketplaceBanner}
        alt=""
        className="absolute inset-0 -z-10 size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand via-brand/70 via-40% to-brand/20" />
      <div className="flex max-w-xl flex-col gap-1">
        <p className="text-base font-semibold text-white">
          {t('marketplaceBanner.title')}
        </p>
        <p className="text-sm text-white/85">
          {t('marketplaceBanner.description')}
        </p>
        <Button size="sm" variant="outline" className="mt-2 self-start" asChild>
          <a
            href={marketplaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="after:absolute after:inset-0"
          >
            {t('marketplaceBanner.button')}
            <ExternalLink />
          </a>
        </Button>
      </div>
    </div>
  );
}
