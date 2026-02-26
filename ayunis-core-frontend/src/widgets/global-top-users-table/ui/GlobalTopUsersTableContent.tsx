import type { GlobalUserUsageDto } from '@/shared/api';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/shared/ui/shadcn/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { Badge } from '@/shared/ui/shadcn/badge';
import { formatCompactNumber } from '@/shared/lib/formatCompactNumber';
import { formatRelativeDate } from '@/shared/lib/format-relative-date';

interface GlobalTopUsersTableContentProps {
  users: GlobalUserUsageDto[];
}

export function GlobalTopUsersTableContent({
  users,
}: Readonly<GlobalTopUsersTableContentProps>) {
  const { t, i18n } = useTranslation('admin-settings-usage');

  const formatCompact = (value: number) =>
    formatCompactNumber(value, i18n.language);

  const renderLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) {
      return <span className="text-muted-foreground">-</span>;
    }

    return (
      <span className="text-sm">
        {formatRelativeDate(lastActivity, i18n.language)}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('globalTopUsers.title')}</CardTitle>
        <CardDescription>
          {t('globalTopUsers.description')}
          {' · '}
          <span className="text-muted-foreground/70">
            {t('globalTopUsers.allProvidersNote')}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border/40">
              <TableHead className="w-12">{t('globalTopUsers.rank')}</TableHead>
              <TableHead>{t('globalTopUsers.name')}</TableHead>
              <TableHead>{t('globalTopUsers.email')}</TableHead>
              <TableHead>{t('globalTopUsers.organization')}</TableHead>
              <TableHead className="text-right">
                {t('globalTopUsers.tokens')}
              </TableHead>
              <TableHead className="text-right">
                {t('globalTopUsers.requests')}
              </TableHead>
              <TableHead>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1">
                        {t('globalTopUsers.lastActivity')}
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('globalTopUsers.lastActivityHint')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <TableRow
                key={user.userId}
                className="border-border/20 transition hover:bg-muted/20"
              >
                <TableCell className="font-medium text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive
                        ? t('globalTopUsers.active')
                        : t('globalTopUsers.inactive')}
                    </Badge>
                    <span className="font-medium">{user.userName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.userEmail}
                </TableCell>
                <TableCell>{user.organizationName}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCompact(user.tokens)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCompact(user.requests)}
                </TableCell>
                <TableCell>{renderLastActivity(user.lastActivity)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
