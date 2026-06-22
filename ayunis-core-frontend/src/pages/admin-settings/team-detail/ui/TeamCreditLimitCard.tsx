import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { SetTeamCreditLimitDialog } from './SetTeamCreditLimitDialog';
import { useTeamCreditLimits } from '../api/useTeamCreditLimits';

interface TeamCreditLimitCardProps {
  teamId: string;
  teamName: string;
}

export function TeamCreditLimitCard({
  teamId,
  teamName,
}: Readonly<TeamCreditLimitCardProps>) {
  const { t } = useTranslation('admin-settings-credit-limits');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { teamLimits, setTeamLimit, removeTeamLimit, isSaving } =
    useTeamCreditLimits(() => setDialogOpen(false));
  const limit = teamLimits.get(teamId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('creditLimits.teamCard.title')}</CardTitle>
        <CardDescription>
          {limit
            ? t('creditLimits.teamCard.current', {
                used: Math.round(limit.creditsUsed).toLocaleString(),
                limit: Math.round(limit.monthlyCredits).toLocaleString(),
              })
            : t('creditLimits.teamCard.none')}
        </CardDescription>
        <CardAction className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen(true)}
          >
            {limit ? t('creditLimits.menu.edit') : t('creditLimits.menu.set')}
          </Button>
          {limit && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => removeTeamLimit(teamId)}
            >
              {t('creditLimits.menu.remove')}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      {dialogOpen && (
        <SetTeamCreditLimitDialog
          open
          onOpenChange={setDialogOpen}
          targetName={teamName}
          initialMonthlyCredits={limit?.monthlyCredits}
          onSubmit={(monthlyCredits) => setTeamLimit(teamId, monthlyCredits)}
          isSaving={isSaving}
        />
      )}
    </Card>
  );
}
