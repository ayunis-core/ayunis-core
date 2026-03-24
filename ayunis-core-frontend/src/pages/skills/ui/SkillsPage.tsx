import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import CreateSkillDialog from './CreateSkillDialog';
import SkillCard from './SkillCard';
import type { Skill } from '../model/openapi';
import SkillsEmptyState from './SkillsEmptyState';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui/shadcn/tabs';
import { EmptyState } from '@/widgets/empty-state';

interface SkillsPageProps {
  skills: Skill[];
}

export default function SkillsPage({ skills }: Readonly<SkillsPageProps>) {
  const { t } = useTranslation('skills');

  const personalSkills = skills
    .filter((skill) => !skill.isShared)
    .sort((a, b) => a.name.localeCompare(b.name));

  const sharedSkills = skills
    .filter((skill) => skill.isShared)
    .sort((a, b) => a.name.localeCompare(b.name));

  const headerAction = (
    <div className="flex gap-2">
      <HelpLink path="skills/" />
      <CreateSkillDialog />
    </div>
  );

  // If no skills at all, show full-screen empty state
  if (skills.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout
          header={
            <ContentAreaHeader
              breadcrumbs={[{ label: t('page.title') }]}
              action={headerAction}
            />
          }
        >
          <SkillsEmptyState />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: t('page.title') }]}
            action={headerAction}
          />
        }
        contentArea={
          <Tabs defaultValue="personal" className="w-full">
            <TabsList>
              <TabsTrigger value="personal">{t('tabs.personal')}</TabsTrigger>
              <TabsTrigger value="shared">{t('tabs.shared')}</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="mt-4">
              {personalSkills.length === 0 ? (
                <EmptyState
                  title={t('emptyState.personal.title')}
                  description={t('emptyState.personal.description')}
                  action={
                    <CreateSkillDialog
                      buttonText={t('createDialog.buttonTextFirst')}
                      showIcon={true}
                    />
                  }
                />
              ) : (
                <div className="space-y-3">
                  {personalSkills.map((skill) => (
                    <SkillCard key={skill.id} skill={skill} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="shared" className="mt-4">
              {sharedSkills.length === 0 ? (
                <EmptyState
                  title={t('emptyState.shared.title')}
                  description={t('emptyState.shared.description')}
                />
              ) : (
                <div className="space-y-3">
                  {sharedSkills.map((skill) => (
                    <SkillCard key={skill.id} skill={skill} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        }
      />
    </AppLayout>
  );
}
