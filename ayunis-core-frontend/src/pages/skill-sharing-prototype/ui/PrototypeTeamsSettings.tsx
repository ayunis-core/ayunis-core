import { Link } from '@tanstack/react-router';
import { ChevronRight, Users } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { EmptyState } from '@/widgets/empty-state';
import {
  findPerson,
  managedTeams,
  personForRole,
} from '@/widgets/sharing-prototype/model/access';
import { usePrototypeState } from '@/widgets/sharing-prototype/model/prototype-store';
import type { Team } from '@/widgets/sharing-prototype/model/types';

function adminLine(team: Team): string {
  if (team.adminIds.length === 0) return 'Noch kein Team-Admin';
  const names = team.adminIds.map((id) => findPerson(id).name).join(', ');
  return team.adminIds.length === 1
    ? `Team-Admin: ${names}`
    : `Team-Admins: ${names}`;
}

export function PrototypeTeamsSettings() {
  const { role } = usePrototypeState();
  const teams = managedTeams(personForRole(role), role);
  if (teams.length === 0) {
    return (
      <EmptyState
        title="Nur für Admins und Team-Admins"
        description="Teams verwalten Admins der Organisation und die Team-Admins des jeweiligen Teams."
      />
    );
  }
  return (
    <div className="space-y-3">
      {teams.map((team) => (
        <Item key={team.id} variant="outline" asChild>
          <Link to="/admin-settings/teams/$id" params={{ id: team.id }}>
            <ItemContent>
              <ItemTitle>
                {team.name}
                <Badge variant="secondary">
                  <Users />
                  {team.memberCount} Mitglieder
                </Badge>
              </ItemTitle>
              <ItemDescription>{adminLine(team)}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRight className="size-4 text-muted-foreground" />
            </ItemActions>
          </Link>
        </Item>
      ))}
    </div>
  );
}
