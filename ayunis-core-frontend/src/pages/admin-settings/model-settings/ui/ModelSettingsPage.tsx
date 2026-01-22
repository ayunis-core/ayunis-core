import { Card, CardContent } from '@/shared/ui/shadcn/card';
import ModelTypeCard from './ModelTypeCard';
import { OrgDefaultModelCard } from './OrgDefaultModelCard';
import SettingsLayout from '../../admin-settings-layout';
import { useTranslation } from 'react-i18next';
import { useModelsWithConfig } from '../api';

export default function ModelSettingsPage() {
  const { t } = useTranslation('admin-settings-models');
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const { models, isLoading: modelsLoading } = useModelsWithConfig();

  // Group models by type
  const languageModels = models.filter((model) => !model.isEmbedding);
  const embeddingModels = models.filter((model) => model.isEmbedding);

  const hasModels = models.length > 0;

  return (
    <SettingsLayout title={tLayout('layout.models')}>
      <div className="space-y-4">
        <OrgDefaultModelCard
          models={languageModels}
          isLoading={modelsLoading}
        />
        {hasModels ? (
          <>
            <ModelTypeCard type="language" models={languageModels} />
            <ModelTypeCard type="embedding" models={embeddingModels} />
          </>
        ) : (
          <Card>
            <CardContent>
              <div className="text-center text-muted-foreground">
                <p>{t('models.noModelsAvailable')}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SettingsLayout>
  );
}
