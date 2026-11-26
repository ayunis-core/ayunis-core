import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Store, type LucideIcon } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { MarketplaceEntryIcon } from '@/features/marketplace';
import { EmptyStateSectionHeading } from './EmptyStateSectionHeading';

export interface EmptyStateMarketplaceEntry {
  identifier: string;
  name: string;
  shortDescription: string;
  iconName: string | null;
  meta?: ReactNode;
}

interface EmptyStateMarketplaceProps {
  kind: 'skill' | 'routine';
  entries: readonly EmptyStateMarketplaceEntry[];
  marketplaceUrl: string;
  fallbackIcon: LucideIcon;
}

export function EmptyStateMarketplace({
  kind,
  entries,
  marketplaceUrl,
  fallbackIcon,
}: Readonly<EmptyStateMarketplaceProps>) {
  const { t } = useTranslation('common');

  return (
    <section
      className="mt-10 w-full text-left"
      data-testid="empty-state-marketplace"
    >
      <EmptyStateSectionHeading icon={Store}>
        {t('emptyState.marketplace.title')}
      </EmptyStateSectionHeading>
      <ul className="grid gap-1 sm:grid-cols-2">
        {entries.map((entry) => (
          <li key={entry.identifier}>
            <Item asChild size="sm">
              <Link
                to="/install"
                search={
                  kind === 'skill'
                    ? { skill: entry.identifier }
                    : { routine: entry.identifier }
                }
                data-testid={`empty-state-marketplace-${entry.identifier}`}
              >
                <ItemMedia variant="icon">
                  <MarketplaceEntryIcon
                    iconName={entry.iconName}
                    fallback={fallbackIcon}
                  />
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle>{entry.name}</ItemTitle>
                  <ItemDescription className="text-pretty">
                    {entry.shortDescription}
                  </ItemDescription>
                  {entry.meta && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {entry.meta}
                    </div>
                  )}
                </ItemContent>
              </Link>
            </Item>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-center">
        <Button variant="ghost" size="sm" asChild>
          <a
            href={marketplaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="empty-state-marketplace-show-all"
          >
            {t('emptyState.marketplace.showAll')}
            <ArrowUpRight />
          </a>
        </Button>
      </div>
    </section>
  );
}
