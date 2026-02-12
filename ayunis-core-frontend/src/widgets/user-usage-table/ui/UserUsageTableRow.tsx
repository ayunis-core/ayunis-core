import type { UserUsageDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { TableCell, TableRow } from '@/shared/ui/shadcn/table';
import { Badge } from '@/shared/ui/shadcn/badge';
import { formatCompactNumber } from '@/shared/lib/formatCompactNumber';

interface UserUsageTableRowProps {
  user: UserUsageDto;
}

export function UserUsageTableRow({ user }: UserUsageTableRowProps) {
  const { t, i18n } = useTranslation('admin-settings-usage');

  const formatCompact = (value?: number) =>
    value === undefined ? '-' : formatCompactNumber(value, i18n.language);

  return (
    <TableRow className="border-border/20 transition hover:bg-muted/20">
      <TableCell>
        <div>
          <div className="font-medium">{user.userName}</div>
          <div className="text-sm text-muted-foreground">{user.userEmail}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{formatCompact(user.tokens)}</div>
        <div className="text-xs text-muted-foreground">
          {t('userUsage.tokens')}
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{formatCompact(user.requests)}</div>
        <div className="text-xs text-muted-foreground">
          {t('userUsage.requests')}
        </div>
      </TableCell>
      <TableCell>
        {user.lastActivity ? (
          <span className="text-sm">
            {/* TODO: Fix typing issue on the dto level */}
            {formatDistanceToNow(
              new Date(user.lastActivity as unknown as string),
              {
                addSuffix: true,
                locale: i18n.language === 'de' ? de : enUS,
              },
            )}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={user.isActive ? 'default' : 'secondary'}>
          {user.isActive ? t('userUsage.active') : t('userUsage.inactive')}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
