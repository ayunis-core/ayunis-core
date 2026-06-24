import { useTranslation } from 'react-i18next';
import { GlobeIcon, Trash2 } from 'lucide-react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { Button } from '@/shared/ui/shadcn/button';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { formatDate } from '@/shared/lib/format-date';
import { useSuperAdminCrawlDomains } from '../api/useSuperAdminCrawlDomains';
import { useSuperAdminRevokeCrawlDomain } from '../api/useSuperAdminRevokeCrawlDomain';
import CreateCrawlDomainDialog from './CreateCrawlDomainDialog';

interface CrawlDomainsSectionProps {
  orgId: string;
}

export default function CrawlDomainsSection({
  orgId,
}: Readonly<CrawlDomainsSectionProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { domains, isLoading, isError } = useSuperAdminCrawlDomains(orgId);
  const { revokeCrawlDomain } = useSuperAdminRevokeCrawlDomain(orgId);

  function renderContent() {
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
        <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
          <p className="text-muted-foreground max-w-sm text-sm">
            {t('crawlDomains.empty')}
          </p>
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('crawlDomains.table.host')}</TableHead>
            <TableHead>{t('crawlDomains.table.createdAt')}</TableHead>
            <TableHead className="w-[100px]">
              {t('crawlDomains.table.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {domains.map((grant) => (
            <TableRow key={grant.id}>
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  <GlobeIcon className="text-muted-foreground h-4 w-4" />
                  {grant.domain}
                </span>
              </TableCell>
              <TableCell>{formatDate(grant.createdAt)}</TableCell>
              <TableCell className="w-[100px]">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  aria-label={t('crawlDomains.remove.button')}
                  onClick={() => revokeCrawlDomain(grant.id, grant.domain)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('crawlDomains.title')}</CardTitle>
        <CardDescription>{t('crawlDomains.description')}</CardDescription>
        <CardAction>
          <CreateCrawlDomainDialog orgId={orgId} />
        </CardAction>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
