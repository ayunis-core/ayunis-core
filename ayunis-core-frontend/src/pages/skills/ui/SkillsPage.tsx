import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import CreateSkillDialog from './CreateSkillDialog';
import SkillCard from './SkillCard';
import type { Skill } from '../model/openapi';
import SkillsEmptyState from './SkillsEmptyState';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';

interface SkillsPageProps {
  skills: Skill[];
}

export default function SkillsPage({ skills }: SkillsPageProps) {
  const { t } = useTranslation('skills');

  const sortedSkills = [...skills].sort((a, b) => a.name.localeCompare(b.name));

  if (skills.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout
          header={
            <ContentAreaHeader
              title={t('page.title')}
              action={<CreateSkillDialog />}
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
            title={t('page.title')}
            action={<CreateSkillDialog />}
          />
        }
        contentArea={
          <div className="space-y-3">
            {sortedSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        }
      />
    </AppLayout>
  );
}
