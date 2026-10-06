import { ExternalLink } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import marketplaceBanner from '@/pages/skill-sharing-prototype/assets/marketplace-banner.jpg';

const MARKETPLACE_URL = 'https://marketplace.ayunis.de';

export function MarketplacePromoBanner() {
  return (
    <Item className="relative isolate overflow-hidden rounded-xl p-5">
      <img
        src={marketplaceBanner}
        alt=""
        className="absolute inset-0 -z-10 size-full object-cover object-top transition-transform duration-300 group-hover/item:scale-[1.02]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand via-brand/70 via-40% to-brand/20" />
      <ItemContent className="max-w-xl gap-1">
        <ItemTitle className="text-base font-semibold text-white">
          Fähigkeiten im Ayunis Core Marketplace entdecken
        </ItemTitle>
        <ItemDescription className="text-white/85">
          Finden Sie fertige Fähigkeiten für Ihren Verwaltungsalltag.
        </ItemDescription>
        <Button size="sm" variant="outline" className="mt-2 self-start" asChild>
          <a
            href={MARKETPLACE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="after:absolute after:inset-0"
          >
            Marketplace öffnen
            <ExternalLink />
          </a>
        </Button>
      </ItemContent>
    </Item>
  );
}
