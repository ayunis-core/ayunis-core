import { useTranslation } from 'react-i18next';
import { useModelsControllerIsEmbeddingModelEnabled } from '@ayunis/api-client/endpoints';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import { RoutineIntegrationsTab } from './RoutineIntegrationsTab';
import { RoutineKnowledgeBasesTab } from './RoutineKnowledgeBasesTab';

/** What a routine can use besides the web; each switch saves on its own. */
export function RoutineContextCard({
  routineId,
}: Readonly<{ routineId: string }>) {
  const { t } = useTranslation('routines');
  const { data: embedding } = useModelsControllerIsEmbeddingModelEnabled();
  const showKnowledgeBases = embedding?.isEmbeddingModelEnabled ?? false;

  return (
    <Card data-testid="routine-context-card">
      <CardHeader>
        <CardTitle>{t('detail.context.title')}</CardTitle>
        <CardDescription>{t('detail.context.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="integrations">
          <TabsList>
            <TabsTrigger
              value="integrations"
              data-testid="routine-context-tab-integrations"
            >
              {t('detail.context.integrations')}
            </TabsTrigger>
            {showKnowledgeBases && (
              <TabsTrigger
                value="knowledge-bases"
                data-testid="routine-context-tab-knowledge-bases"
              >
                {t('detail.context.knowledgeBases')}
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="integrations" className="mt-4">
            <RoutineIntegrationsTab routineId={routineId} />
          </TabsContent>
          {showKnowledgeBases && (
            <TabsContent value="knowledge-bases" className="mt-4">
              <RoutineKnowledgeBasesTab routineId={routineId} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
