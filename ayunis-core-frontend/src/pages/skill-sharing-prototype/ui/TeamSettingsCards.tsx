import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { showInfo } from '@/shared/lib/toast';
import {
  isTeamAdminWith,
  personForRole,
} from '@/widgets/sharing-prototype/model/access';
import { usePrototypeState } from '@/widgets/sharing-prototype/model/prototype-store';

function SettingCard({
  title,
  description,
  actionLabel,
  notice,
}: Readonly<{
  title: string;
  description: string;
  actionLabel: string;
  notice: string;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => showInfo(notice)}>
            {actionLabel}
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export function TeamModelsCard() {
  return (
    <SettingCard
      title="Modelle"
      description="Dieses Team verwendet die Modellauswahl der Organisation."
      actionLabel="Unter Modelle verwalten"
      notice="Modelle lassen sich im Prototyp nicht einstellen."
    />
  );
}

export function TeamCreditLimitCard() {
  return (
    <SettingCard
      title="Guthaben-Limit"
      description="Kein zusätzliches Limit"
      actionLabel="Konfigurieren"
      notice="Guthaben-Limits lassen sich im Prototyp nicht einstellen."
    />
  );
}

export function AddTeamMembersButton({ teamId }: Readonly<{ teamId: string }>) {
  const { role } = usePrototypeState();
  const mayAdd =
    role === 'orgAdmin' ||
    isTeamAdminWith(teamId, personForRole(role), 'team_manage_members');
  if (!mayAdd) return null;
  return (
    <Button
      size="sm"
      onClick={() =>
        showInfo('Mitglieder hinzufügen gibt es im Prototyp nicht.')
      }
    >
      Mitglieder hinzufügen
    </Button>
  );
}
