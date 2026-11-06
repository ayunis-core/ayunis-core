import { Badge } from '@ayunis/ui/components/badge';
import { useTranslation } from 'react-i18next';
import { useMyTeams } from '@/features/permissions';
import type { OwnedResource } from '@/features/resource-ownership/model/types';

/** Names the team or organization owning a resource; nothing for personal ones. */
export function OwnerBadge({
  resource,
  className,
  testId,
}: Readonly<{
  resource: OwnedResource;
  className?: string;
  testId?: string;
}>) {
  const { t } = useTranslation('ownership');
  const { teams } = useMyTeams();

  if (resource.ownerType === 'org') {
    return (
      <Badge
        variant="secondary"
        className={className}
        data-testid={testId}
        data-owner-type="org"
      >
        {t('owner.org')}
      </Badge>
    );
  }
  if (resource.ownerType !== 'team') return null;
  const team = teams.find(({ id }) => id === resource.teamId);
  return (
    <Badge
      variant="secondary"
      className={className}
      data-testid={testId}
      data-owner-type="team"
    >
      {team ? t('badge.team', { name: team.name }) : t('owner.unknownTeam')}
    </Badge>
  );
}
