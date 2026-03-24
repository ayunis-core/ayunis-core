import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { Alert, AlertTitle, AlertDescription } from '@/shared/ui/shadcn/alert';
import { Info } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import ModelTypeCard from './ModelTypeCard';
import { OrgDefaultModelCard } from './OrgDefaultModelCard';
import SettingsLayout from '../../admin-settings-layout';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { Trans, useTranslation } from 'react-i18next';
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
    <SettingsLayout
      action={<HelpLink path="settings/admin/models/" />}
      title={tLayout('layout.models')}
    >
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>{t('models.teamHint.title')}</AlertTitle>
          <AlertDescription className="inline">
            <Trans
              i18nKey="models.teamHint.description"
              ns="admin-settings-models"
              components={{
                teamsLink: (
                  <Link
                    to="/admin-settings/teams"
                    className="font-medium underline underline-offset-4 hover:text-primary"
                  />
                ),
              }}
            />
          </AlertDescription>
        </Alert>
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
