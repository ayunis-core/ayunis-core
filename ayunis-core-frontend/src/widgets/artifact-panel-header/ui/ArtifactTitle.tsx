import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import type { ArtifactResponseDto } from '@/shared/api';
import { resolveArtifactTitle } from '@/widgets/artifact-panel-header/lib/resolve-artifact-title';

interface ArtifactTitleProps {
  readonly artifact: Pick<
    ArtifactResponseDto,
    'title' | 'piiMasks' | 'isAnonymous'
  >;
}

export function ArtifactTitle({ artifact }: ArtifactTitleProps) {
  const { t } = useTranslation('artifacts');
  const title = resolveArtifactTitle(artifact);
  return (
    <>
      <h3 className="truncate text-sm font-semibold" title={title}>
        {title}
      </h3>
      {artifact.isAnonymous && (
        <Badge
          variant="secondary"
          className="ml-1 shrink-0"
          data-testid="artifact-anonymized-badge"
        >
          <ShieldCheck />
          {t('panel.anonymized')}
        </Badge>
      )}
    </>
  );
}
