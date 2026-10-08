import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { CreditLimitDialog } from '@/widgets/credit-limit-editor/ui/CreditLimitDialog';

export function DefaultUserLimitCard({
  defaultLimit,
}: Readonly<{ defaultLimit: number | null }>) {
  const { t, i18n } = useTranslation('admin-settings-credit-limits');
  const [editing, setEditing] = useState(false);
  return (
    <Card data-testid="credit-limits-default-user">
      <CardHeader>
        <CardTitle>{t('defaultLimit.title')}</CardTitle>
        <CardDescription>{t('defaultLimit.description')}</CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            data-testid="credit-limits-default-user-configure"
          >
            {t('table.configure')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent data-testid="credit-limits-default-user-value">
        {defaultLimit === null
          ? t('defaultLimit.notSet')
          : t('defaultLimit.value', {
              credits: defaultLimit.toLocaleString(i18n.language),
            })}
        {defaultLimit === 0 && (
          <span className="ml-2 text-muted-foreground">
            {t('table.blocked')}
          </span>
        )}
      </CardContent>
      {editing && (
        <CreditLimitDialog
          target="default-user"
          id=""
          name={t('defaultLimit.title')}
          initialLimit={defaultLimit}
          onClose={() => setEditing(false)}
        />
      )}
    </Card>
  );
}
