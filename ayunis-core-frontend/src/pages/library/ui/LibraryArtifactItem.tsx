import { FileText, GitBranch, ShieldCheck, Table2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type {
  ArtifactResponseDto,
  ArtifactResponseDtoType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatDate } from '@/shared/lib/format-date';
import { resolveArtifactTitle } from '@/widgets/artifact-panel-header';

const artifactIcons: Record<ArtifactResponseDtoType, LucideIcon> = {
  document: FileText,
  spreadsheet: Table2,
  diagram: GitBranch,
};

export default function LibraryArtifactItem({
  artifact,
}: Readonly<{ artifact: ArtifactResponseDto }>) {
  const { t } = useTranslation('artifacts');
  const Icon = artifactIcons[artifact.type];
  return (
    <Item
      asChild
      variant="outline"
      data-testid={`library-artifact-${artifact.id}`}
    >
      <Link to="/artifacts/$artifactId" params={{ artifactId: artifact.id }}>
        <ItemMedia variant="icon">
          <Icon />
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle className="max-w-full">
            <span className="truncate">{resolveArtifactTitle(artifact)}</span>
            {artifact.isAnonymous && (
              <Badge
                variant="secondary"
                className="shrink-0"
                data-testid="library-artifact-anonymized"
              >
                <ShieldCheck />
                {t('panel.anonymized')}
              </Badge>
            )}
          </ItemTitle>
          <ItemDescription>
            {t(`library.type.${artifact.type}`)} ·{' '}
            {t('library.changedAt', { date: formatDate(artifact.updatedAt) })}
          </ItemDescription>
        </ItemContent>
      </Link>
    </Item>
  );
}
