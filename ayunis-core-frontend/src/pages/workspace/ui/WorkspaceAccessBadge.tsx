import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import type { WorkspaceAccessLevel } from '@/features/workspaces';

export function WorkspaceAccessBadge({
  accessLevel,
}: Readonly<{ accessLevel: WorkspaceAccessLevel }>) {
  const { t } = useTranslation('workspace-sharing');

  return (
    <Badge variant="outline" data-testid="workspace-access-badge">
      {accessLevel === 'use' && <Lock />}
      {t(`viewer.${accessLevel}`)}
    </Badge>
  );
}
