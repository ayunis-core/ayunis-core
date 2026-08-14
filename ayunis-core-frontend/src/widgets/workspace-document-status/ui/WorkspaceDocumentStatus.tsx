import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { SourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function WorkspaceDocumentStatus({
  status,
}: Readonly<{ status: SourceResponseDtoStatus }>) {
  const { t } = useTranslation('workspace');
  if (status === SourceResponseDtoStatus.ready) return null;
  return (
    <Badge variant="secondary">{t(`context.documents.status.${status}`)}</Badge>
  );
}
