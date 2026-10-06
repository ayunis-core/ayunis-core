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
  defaultLimit?: number | null;
  isPending: boolean;
  isError: boolean;
  onRetry?: () => void;
}

export function CreditLimitsTable({
  rows,
  filters,
  defaultLimit = null,
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
              defaultLimit={filters.tab === 'users' ? defaultLimit : null}
              onConfigure={() => setSelected({ row, target: filters.tab })}
            />
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3}>{t('table.empty')}</TableCell>
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
  defaultLimit,
  onConfigure,
}: Readonly<{
  row: CreditLimitRow;
  target: CreditLimitTarget;
  defaultLimit: number | null;
  onConfigure: () => void;
}>) {
  const { t, i18n } = useTranslation('admin-settings-credit-limits');
  const limit = row.limit;
  const effectiveCredits = limit?.monthlyCredits ?? defaultLimit;
  let limitLabel: string;
  if (limit !== null) {
    limitLabel = `${limit.creditsUsed.toLocaleString(i18n.language)} / ${limit.monthlyCredits.toLocaleString(i18n.language)}`;
  } else if (defaultLimit !== null) {
    limitLabel = t('table.defaultLimit', {
      credits: defaultLimit.toLocaleString(i18n.language),
    });
  } else {
    limitLabel = t('form.noLimit');
  }
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
        {effectiveCredits === 0 && (
          <span className="ml-2 text-muted-foreground">
            {t('table.blocked')}
          </span>
        )}
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
