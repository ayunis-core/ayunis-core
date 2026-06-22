import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';

export interface CreditLimitRow {
  id: string;
  name: string;
  secondary?: string;
  monthlyCredits: number;
  creditsUsed: number;
}

const RowStatus = {
  AtLimit: 'atLimit',
  NearLimit: 'nearLimit',
  Ok: 'ok',
} as const;
type RowStatus = (typeof RowStatus)[keyof typeof RowStatus];

const NEAR_LIMIT_RATIO = 0.8;

// Mirrors the backend guard: a run is blocked once creditsUsed >= the limit
// (so a 0 limit is always "atLimit" — i.e. frozen).
function getRowStatus(row: CreditLimitRow): RowStatus {
  if (row.creditsUsed >= row.monthlyCredits) return RowStatus.AtLimit;
  if (
    row.monthlyCredits > 0 &&
    row.creditsUsed / row.monthlyCredits >= NEAR_LIMIT_RATIO
  ) {
    return RowStatus.NearLimit;
  }
  return RowStatus.Ok;
}

// Order rows are displayed in — most urgent first.
const STATUS_DISPLAY_ORDER: readonly RowStatus[] = [
  RowStatus.AtLimit,
  RowStatus.NearLimit,
  RowStatus.Ok,
];

interface CreditLimitsSectionProps {
  title: string;
  addLabel: string;
  canAdd: boolean;
  rows: CreditLimitRow[];
  emptyLabel: string;
  onAdd: () => void;
  onEdit: (row: CreditLimitRow) => void;
  onRemove: (row: CreditLimitRow) => void;
}

export function CreditLimitsSection({
  title,
  addLabel,
  canAdd,
  rows,
  emptyLabel,
  onAdd,
  onEdit,
  onRemove,
}: Readonly<CreditLimitsSectionProps>) {
  const { t } = useTranslation('admin-settings-credit-limits');

  // Surface exhausted/near-limit rows first so an admin can tell at a glance
  // which users/teams are currently blocked.
  const sortedRows = [...rows].sort(
    (a, b) =>
      STATUS_DISPLAY_ORDER.indexOf(getRowStatus(a)) -
      STATUS_DISPLAY_ORDER.indexOf(getRowStatus(b)),
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <Button size="sm" variant="outline" disabled={!canAdd} onClick={onAdd}>
          <Plus />
          {addLabel}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {sortedRows.map((row) => {
            const status = getRowStatus(row);
            return (
              <Item key={row.id} variant="outline">
                <ItemContent>
                  <ItemTitle className="flex items-center gap-2">
                    {row.name}
                    {status === RowStatus.AtLimit && (
                      <Badge variant="destructive">
                        {t('creditLimits.status.atLimit')}
                      </Badge>
                    )}
                    {status === RowStatus.NearLimit && (
                      <Badge variant="secondary">
                        {t('creditLimits.status.nearLimit')}
                      </Badge>
                    )}
                  </ItemTitle>
                  <ItemDescription>
                    {row.secondary ? `${row.secondary} · ` : ''}
                    {t('creditLimits.usage', {
                      used: Math.round(row.creditsUsed).toLocaleString(),
                      limit: Math.round(row.monthlyCredits).toLocaleString(),
                    })}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('creditLimits.edit')}
                    onClick={() => onEdit(row)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('creditLimits.remove.action')}
                    onClick={() => onRemove(row)}
                  >
                    <Trash2 />
                  </Button>
                </ItemActions>
              </Item>
            );
          })}
        </div>
      )}
    </section>
  );
}
