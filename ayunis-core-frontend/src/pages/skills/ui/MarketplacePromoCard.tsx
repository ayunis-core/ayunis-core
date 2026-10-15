import { ExternalLink, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useSkillMarketplaceUrl } from '@/features/marketplace';

export default function MarketplacePromoCard() {
  const { t } = useTranslation('skills');
  const marketplaceUrl = useSkillMarketplaceUrl();

  if (!marketplaceUrl) {
    return null;
  }

  return (
    <Item
      asChild
      variant="muted"
      className="mt-4 border-brand/40 bg-brand/10 hover:bg-brand/20"
    >
      <a
        href={marketplaceUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('marketplaceBanner.title')}
        data-testid="skills-marketplace-banner"
      >
        <ItemMedia variant="icon" className="text-brand">
          <Store />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            <span>{t('marketplaceBanner.title')}</span>
            <ExternalLink className="size-4 text-brand" />
          </ItemTitle>
          <ItemDescription>
            {t('marketplaceBanner.description')}
          </ItemDescription>
        </ItemContent>
      </a>
    </Item>
  );
}
