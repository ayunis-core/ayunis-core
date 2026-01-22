import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from '@/shared/ui/shadcn/item';
import { TeamsEmptyState } from './TeamsEmptyState';
import { useDeleteTeam } from '../api/useDeleteTeam';
import type { Team } from '../model/types';

interface TeamsListProps {
  teams: Team[];
}

export function TeamsList({ teams }: TeamsListProps) {
  const { t } = useTranslation('admin-settings-teams');
  const { deleteTeam, isDeleting } = useDeleteTeam();

  if (teams.length === 0) {
    return <TeamsEmptyState />;
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => (
        <Item key={team.id} variant="outline">
          <ItemContent>
            <ItemTitle>{team.name}</ItemTitle>
            <ItemDescription>
              {t('teams.list.createdAt', {
                date: new Date(team.createdAt).toLocaleDateString(),
              })}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteTeam(team.id)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </ItemActions>
        </Item>
      ))}
    </div>
  );
}
