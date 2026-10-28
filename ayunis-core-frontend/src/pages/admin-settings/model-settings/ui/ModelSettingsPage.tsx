import { Link } from '@tanstack/react-router';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import OrganizationModels from './OrganizationModels';
import { ModelTeamsTable } from './ModelTeamsTable';

interface ModelSettingsPageProps {
  readonly tab: 'organization' | 'teams';
  readonly search: string;
  readonly onSearchChange: (search: string) => void;
}

export default function ModelSettingsPage({
  tab,
  search,
  onSearchChange,
}: ModelSettingsPageProps) {
  const { t } = useTranslation('admin-settings-models');
  const { t: tLayout } = useTranslation('admin-settings-layout');
  return (
    <SettingsLayout
      title={tLayout('layout.models')}
      action={<HelpLink path="settings/admin/models/" />}
    >
      <Tabs value={tab} className="space-y-4">
        <TabsList>
          {(['organization', 'teams'] as const).map((value) => (
            <TabsTrigger key={value} value={value} asChild>
              <Link
                to="/admin-settings/models"
                search={{ tab: value, search }}
                data-testid={`models-${value}-tab`}
              >
                {t(`tabs.${value}`)}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="organization" className="space-y-4">
          <OrganizationModels />
        </TabsContent>
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>{t('teams.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelTeamsTable
                search={search}
                onSearchChange={onSearchChange}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </SettingsLayout>
  );
}
