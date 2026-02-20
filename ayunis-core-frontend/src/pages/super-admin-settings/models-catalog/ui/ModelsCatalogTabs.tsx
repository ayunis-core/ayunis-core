import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui/shadcn/tabs';

interface ModelsCatalogTabsProps {
  activeCount: number;
  archivedCount: number;
  renderActiveContent: () => ReactNode;
  renderArchivedContent: () => ReactNode;
}

export function ModelsCatalogTabs({
  activeCount,
  archivedCount,
  renderActiveContent,
  renderArchivedContent,
}: Readonly<ModelsCatalogTabsProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as 'active' | 'archived')}
    >
      <TabsList>
        <TabsTrigger value="active">
          {t('models.tabs.active')} ({activeCount})
        </TabsTrigger>
        <TabsTrigger value="archived">
          {t('models.tabs.archived')} ({archivedCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-4">
        {renderActiveContent()}
      </TabsContent>

      <TabsContent value="archived" className="mt-4">
        {renderArchivedContent()}
      </TabsContent>
    </Tabs>
  );
}
