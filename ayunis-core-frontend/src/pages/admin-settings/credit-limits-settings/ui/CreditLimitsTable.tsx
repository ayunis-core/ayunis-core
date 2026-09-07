import { useState } from 'react';
import { CreditLimitDialog } from '@/widgets/credit-limit-editor/ui/CreditLimitDialog';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import { CreditLimitState } from '@/widgets/credit-limit-context/ui/CreditLimitState';
import type {
  CreditLimitSearch,
  CreditLimitTarget,
} from '@/features/credit-limits/model/credit-limit-settings';
import type { CreditLimitRow } from '@/pages/admin-settings/credit-limits-settings/model/types';

interface Props {
  rows: CreditLimitRow[];
  filters: CreditLimitSearch;
  isPending: boolean;
  isError: boolean;
  onRetry?: () => void;
}

export function CreditLimitsTable({
  rows,
  filters,
  isPending,
  isError,
  onRetry,
}: Readonly<Props>) {
  const { t } = useTranslation('admin-settings-credit-limits');
  const [selected, setSelected] = useState<{
    row: CreditLimitRow;
    target: CreditLimitTarget;
  } | null>(null);
  return (
    <CreditLimitState isPending={isPending} isError={isError} onRetry={onRetry}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t(`tabs.${filters.tab}`)}</TableHead>
            <TableHead>{t('table.limit')}</TableHead>
            <TableHead>{t('table.used')}</TableHead>
            <TableHead>
              <span className="sr-only">{t('table.actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <CreditLimitTableRow
              key={row.id}
              row={row}
              target={filters.tab}
              onConfigure={() => setSelected({ row, target: filters.tab })}
            />
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>{t('table.empty')}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {selected && (
        <CreditLimitDialog
          id={selected.row.id}
          name={selected.row.name}
          target={selected.target}
          initialLimit={selected.row.limit?.monthlyCredits ?? null}
          onClose={() => setSelected(null)}
        />
      )}
    </CreditLimitState>
  );
}

function CreditLimitTableRow({
  row,
  target,
  onConfigure,
}: Readonly<{
  row: CreditLimitRow;
  target: CreditLimitTarget;
  onConfigure: () => void;
}>) {
  const { t, i18n } = useTranslation('admin-settings-credit-limits');
  const limit = row.limit;
  const limitLabel =
    limit === null
      ? t('form.noLimit')
      : limit.monthlyCredits.toLocaleString(i18n.language);
  return (
    <TableRow data-testid={`credit-limits-row-${row.id}`}>
      <TableCell>
        <div className="font-medium">{row.name}</div>
        {row.email && (
          <div className="text-muted-foreground text-sm">{row.email}</div>
        )}
      </TableCell>
      <TableCell>
        {limitLabel}
        {limit?.monthlyCredits === 0 && (
          <span className="ml-2 text-muted-foreground">
            {t('table.blocked')}
          </span>
        )}
      </TableCell>
      <TableCell>
        {limit
          ? limit.creditsUsed.toLocaleString(i18n.language)
          : t('table.usageUnavailable')}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={onConfigure}
          data-testid={`credit-limits-${target === 'users' ? 'user' : 'team'}-${row.id}`}
        >
          {t('table.configure')}
        </Button>
      </TableCell>
    </TableRow>
  );
}
