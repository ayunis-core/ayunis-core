import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeIcon, Trash2Icon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { useSuperAdminCrawlDomains } from '../api/useSuperAdminCrawlDomains';
import { useSuperAdminGrantCrawlDomain } from '../api/useSuperAdminGrantCrawlDomain';
import { useSuperAdminRevokeCrawlDomain } from '../api/useSuperAdminRevokeCrawlDomain';

interface CrawlDomainsSectionProps {
  orgId: string;
}

export default function CrawlDomainsSection({
  orgId,
}: Readonly<CrawlDomainsSectionProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { domains, isLoading, isError } = useSuperAdminCrawlDomains(orgId);
  const { grantCrawlDomain, isLoading: isGranting } =
    useSuperAdminGrantCrawlDomain(orgId);
  const { revokeCrawlDomain } = useSuperAdminRevokeCrawlDomain(orgId);
  const [value, setValue] = useState('');

  const trimmed = value.trim();

  function handleAdd() {
    if (!trimmed) return;
    grantCrawlDomain(trimmed);
    setValue('');
  }

  function renderDomains() {
    if (isLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }
    if (isError) {
      return (
        <p className="text-destructive text-sm">{t('crawlDomains.error')}</p>
      );
    }
    if (domains.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          {t('crawlDomains.empty')}
        </p>
      );
    }
    return (
      <ul className="divide-y rounded-md border">
        {domains.map((grant) => (
          <li
            key={grant.id}
            className="flex items-center justify-between gap-2 px-3 py-2"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <GlobeIcon className="text-muted-foreground h-4 w-4" />
              {grant.domain}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crawlDomains.remove.button')}
              onClick={() => revokeCrawlDomain(grant.id, grant.domain)}
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('crawlDomains.title')}</CardTitle>
        <CardDescription>{t('crawlDomains.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('crawlDomains.add.placeholder')}
            aria-label={t('crawlDomains.add.placeholder')}
          />
          <Button type="submit" disabled={!trimmed || isGranting}>
            {t('crawlDomains.add.button')}
          </Button>
        </form>

        {renderDomains()}
      </CardContent>
    </Card>
  );
}
