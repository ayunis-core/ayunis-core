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

export interface CreditLimitRow {
  id: string;
  name: string;
  secondary?: string;
  monthlyCredits: number;
  creditsUsed: number;
}

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

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <Button size="sm" variant="outline" disabled={!canAdd} onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Item key={row.id} variant="outline">
              <ItemContent>
                <ItemTitle>{row.name}</ItemTitle>
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
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('creditLimits.remove.action')}
                  onClick={() => onRemove(row)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </ItemActions>
            </Item>
          ))}
        </div>
      )}
    </section>
  );
}
