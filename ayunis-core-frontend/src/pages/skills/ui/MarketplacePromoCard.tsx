import { ExternalLink, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { useMarketplaceConfig } from '@/features/marketplace';

export default function MarketplacePromoCard() {
  const { t } = useTranslation('skills');
  const marketplace = useMarketplaceConfig();

  if (!marketplace.enabled || !marketplace.url) {
    return null;
  }

  return (
    <Item
      asChild
      variant="muted"
      className="mt-4 border-primary/40 bg-primary/10 hover:bg-primary/20"
    >
      <a
        href={marketplace.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('marketplaceBanner.title')}
      >
        <ItemMedia variant="icon" className="text-primary">
          <Store />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            <span>{t('marketplaceBanner.title')}</span>
            <ExternalLink className="size-4 text-primary" />
          </ItemTitle>
          <ItemDescription>
            {t('marketplaceBanner.description')}
          </ItemDescription>
        </ItemContent>
      </a>
    </Item>
  );
}
