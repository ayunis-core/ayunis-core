import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Input } from '@ayunis/ui/components/input';
import { Button } from '@ayunis/ui/components/button';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import { useModelTeams } from '@/pages/admin-settings/model-settings/api/useModelTeams';

interface ModelTeamsTableProps {
  readonly search: string;
  readonly onSearchChange: (search: string) => void;
}

export function ModelTeamsTable({
  search,
  onSearchChange,
}: ModelTeamsTableProps) {
  const { t } = useTranslation('admin-settings-models');
  const { teams, isLoading, isError } = useModelTeams();
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  if (isLoading) return <p role="status">{t('teams.loading')}</p>;
  if (isError) return <p role="alert">{t('teams.loadError')}</p>;
  return (
    <div className="space-y-4">
      <Input
        data-testid="models-team-search"
        aria-label={t('teams.search')}
        placeholder={t('teams.search')}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('teams.name')}</TableHead>
            <TableHead>{t('teams.policy')}</TableHead>
            <TableHead>
              <span className="sr-only">{t('teams.configure')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTeams.map((team) => (
            <TableRow key={team.id} data-testid={`models-team-${team.id}`}>
              <TableCell className="font-medium">{team.name}</TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  data-testid={`models-team-${team.id}-policy`}
                  data-policy={
                    team.modelOverrideEnabled ? 'custom' : 'inherited'
                  }
                >
                  {t(
                    team.modelOverrideEnabled
                      ? 'teams.custom'
                      : 'teams.inherited',
                  )}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/admin-settings/models/teams/$id"
                    params={{ id: team.id }}
                    search={{ tab: 'teams', search }}
                    data-testid={`models-team-${team.id}-configure`}
                  >
                    {t('teams.configure')}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filteredTeams.length === 0 && (
        <p
          data-testid="models-teams-empty"
          className="text-muted-foreground py-8 text-center"
        >
          {t(teams.length === 0 ? 'teams.empty' : 'teams.noMatches')}
        </p>
      )}
    </div>
  );
}
