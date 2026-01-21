import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from '@/shared/ui/shadcn/item';
import { TeamsEmptyState } from './TeamsEmptyState';
import type { Team } from '../model/types';

interface TeamsListProps {
  teams: Team[];
}

export function TeamsList({ teams }: TeamsListProps) {
  const { t } = useTranslation('admin-settings-teams');

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
        </Item>
      ))}
    </div>
  );
}
