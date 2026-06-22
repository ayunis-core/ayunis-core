import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useUserControllerGetUsersInOrganization,
  useTeamsControllerListTeams,
} from '@/shared/api/generated/ayunisCoreAPI';
import SettingsLayout from '../../admin-settings-layout';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { useRemoveCreditLimit } from '../api/useRemoveCreditLimit';
import { SetCreditLimitDialog } from './SetCreditLimitDialog';
import {
  CreditLimitsSection,
  type CreditLimitRow,
} from './CreditLimitsSection';
import type { CreditLimitScope, CreditLimitsOverview } from '../model/types';

interface DialogState {
  scope: CreditLimitScope;
  mode: 'create' | 'edit';
  target?: { id: string; name: string };
  initialMonthlyCredits?: number;
  options?: { id: string; name: string }[];
}

interface CreditLimitsSettingsPageProps {
  overview: CreditLimitsOverview;
}

export function CreditLimitsSettingsPage({
  overview,
}: Readonly<CreditLimitsSettingsPageProps>) {
  const { t } = useTranslation('admin-settings-credit-limits');
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const { removeUserLimit, removeTeamLimit } = useRemoveCreditLimit();

  const { data: usersData } = useUserControllerGetUsersInOrganization({
    limit: 100,
    offset: 0,
  });
  const { data: teams } = useTeamsControllerListTeams();

  const userRows: CreditLimitRow[] = overview.users.map((item) => ({
    id: item.userId,
    name: item.name || item.email,
    secondary: item.email,
    monthlyCredits: item.monthlyCredits,
    creditsUsed: item.creditsUsed,
  }));
  const teamRows: CreditLimitRow[] = overview.teams.map((item) => ({
    id: item.teamId,
    name: item.name,
    monthlyCredits: item.monthlyCredits,
    creditsUsed: item.creditsUsed,
  }));

  const availableUsers = useMemo(() => {
    const limited = new Set(overview.users.map((u) => u.userId));
    return (usersData?.data ?? [])
      .filter((u) => !limited.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name ? `${u.name} (${u.email})` : u.email,
      }));
  }, [usersData, overview.users]);

  const availableTeams = useMemo(() => {
    const limited = new Set(overview.teams.map((team) => team.teamId));
    return (teams ?? [])
      .filter((team) => !limited.has(team.id))
      .map((team) => ({ id: team.id, name: team.name }));
  }, [teams, overview.teams]);

  return (
    <SettingsLayout
      action={<HelpLink path="settings/admin/credit-limits/" />}
      title={tLayout('layout.creditLimits')}
    >
      <div className="space-y-8">
        <p className="text-muted-foreground text-sm">
          {t('creditLimits.intro')}
        </p>

        <CreditLimitsSection
          title={t('creditLimits.users.title')}
          addLabel={t('creditLimits.users.add')}
          canAdd={availableUsers.length > 0}
          rows={userRows}
          emptyLabel={t('creditLimits.users.empty')}
          onAdd={() =>
            setDialog({
              scope: 'user',
              mode: 'create',
              options: availableUsers,
            })
          }
          onEdit={(row) =>
            setDialog({
              scope: 'user',
              mode: 'edit',
              target: { id: row.id, name: row.name },
              initialMonthlyCredits: row.monthlyCredits,
            })
          }
          onRemove={(row) => removeUserLimit(row.id)}
        />

        <CreditLimitsSection
          title={t('creditLimits.teams.title')}
          addLabel={t('creditLimits.teams.add')}
          canAdd={availableTeams.length > 0}
          rows={teamRows}
          emptyLabel={t('creditLimits.teams.empty')}
          onAdd={() =>
            setDialog({
              scope: 'team',
              mode: 'create',
              options: availableTeams,
            })
          }
          onEdit={(row) =>
            setDialog({
              scope: 'team',
              mode: 'edit',
              target: { id: row.id, name: row.name },
              initialMonthlyCredits: row.monthlyCredits,
            })
          }
          onRemove={(row) => removeTeamLimit(row.id)}
        />

        {dialog && (
          <SetCreditLimitDialog
            open
            onOpenChange={(open) => !open && setDialog(null)}
            scope={dialog.scope}
            mode={dialog.mode}
            target={dialog.target}
            initialMonthlyCredits={dialog.initialMonthlyCredits}
            options={dialog.options}
          />
        )}
      </div>
    </SettingsLayout>
  );
}
