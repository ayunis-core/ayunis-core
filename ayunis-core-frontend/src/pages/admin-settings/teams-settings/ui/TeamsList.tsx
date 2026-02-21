import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Pencil, Trash2, ChevronRight } from 'lucide-react';
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
  onEditTeam: (team: Team) => void;
}

export function TeamsList({ teams, onEditTeam }: Readonly<TeamsListProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const { deleteTeam, isDeleting } = useDeleteTeam();

  if (teams.length === 0) {
    return <TeamsEmptyState />;
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => (
        <Item key={team.id} variant="outline">
          <Link
            to="/admin-settings/teams/$id"
            params={{ id: team.id }}
            className="flex-1 cursor-pointer"
          >
            <ItemContent>
              <ItemTitle>{team.name}</ItemTitle>
              <ItemDescription>
                {t('teams.list.createdAt', {
                  date: new Date(team.createdAt).toLocaleDateString(),
                })}
              </ItemDescription>
            </ItemContent>
          </Link>
          <ItemActions>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEditTeam(team);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                deleteTeam(team.id);
              }}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Link
              to="/admin-settings/teams/$id"
              params={{ id: team.id }}
              className="flex items-center"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </ItemActions>
        </Item>
      ))}
    </div>
  );
}
