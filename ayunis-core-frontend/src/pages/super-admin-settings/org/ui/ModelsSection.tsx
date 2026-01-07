import { Card, CardContent } from '@/shared/ui/shadcn/card';
import ModelTypeCard from './ModelTypeCard';
import { useSuperAdminModels } from '../api/useSuperAdminModels';
import { useTranslation } from 'react-i18next';
import { SuperAdminOrgDefaultModelCard } from './SuperAdminOrgDefaultModelCard';

interface ModelsSectionProps {
  orgId: string;
}

export default function ModelsSection({ orgId }: ModelsSectionProps) {
  const { t } = useTranslation('admin-settings-models');
  const { models, isLoading } = useSuperAdminModels(orgId);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>{t('models.loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group models by type
  const languageModels = models.filter((model) => !model.isEmbedding);
  const embeddingModels = models.filter((model) => model.isEmbedding);

  const hasModels = models.length > 0;

  return (
    <div className="space-y-4">
      <SuperAdminOrgDefaultModelCard
        models={models}
        isLoading={isLoading}
        orgId={orgId}
      />
      {hasModels ? (
        <>
          <ModelTypeCard
            type="language"
            models={languageModels}
            orgId={orgId}
          />
          <ModelTypeCard
            type="embedding"
            models={embeddingModels}
            orgId={orgId}
          />
        </>
      ) : (
        <Card>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              <p>{t('models.noModelsAvailable')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
