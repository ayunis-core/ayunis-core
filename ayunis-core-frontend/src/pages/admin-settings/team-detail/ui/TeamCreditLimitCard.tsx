import { useState } from 'react';
import { CreditLimitDialog } from '@/widgets/credit-limit-editor/ui/CreditLimitDialog';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Button } from '@ayunis/ui/components/button';
import { useTeamCreditLimits } from '@/pages/admin-settings/team-detail/api/useTeamCreditLimits';

interface TeamCreditLimitCardProps {
  teamId: string;
  teamName: string;
  canManage?: boolean;
}

export function TeamCreditLimitCard({
  teamId,
  teamName,
  canManage = true,
}: Readonly<TeamCreditLimitCardProps>) {
  const { t, i18n } = useTranslation('admin-settings-credit-limits');
  const { teamLimits, isLoading, isError } = useTeamCreditLimits();
  const limit = teamLimits.get(teamId);
  const [isOpen, setIsOpen] = useState(false);
  if (!canManage && isOpen) setIsOpen(false);
  let description = t('form.noLimit');
  if (limit)
    description = t(
      limit.creditsUsed === undefined
        ? 'creditLimits.teamCard.limitOnly'
        : 'creditLimits.teamCard.current',
      {
        used: limit.creditsUsed?.toLocaleString(i18n.language),
        limit: limit.monthlyCredits.toLocaleString(i18n.language),
      },
    );
  if (isLoading) description = t('states.loading');
  if (isError) description = t('states.error');
  return (
    <Card data-testid={`credit-limits-team-card-${teamId}`}>
      <CardHeader>
        <CardTitle>{t('creditLimits.teamCard.title')}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            disabled={!canManage || isLoading || isError}
            onClick={() => setIsOpen(true)}
            data-testid={`credit-limits-team-${teamId}`}
          >
            {t('table.configure')}
          </Button>
        </CardAction>
      </CardHeader>
      {isOpen && canManage && (
        <CreditLimitDialog
          id={teamId}
          name={teamName}
          target="teams"
          initialLimit={limit?.monthlyCredits ?? null}
          onClose={() => setIsOpen(false)}
        />
      )}
    </Card>
  );
}
