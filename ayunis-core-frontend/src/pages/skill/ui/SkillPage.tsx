import AppLayout from '@/layouts/app-layout';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import SkillPropertiesCard from './SkillPropertiesCard';
import SkillKnowledgeBaseCard from './SkillKnowledgeBaseCard';
import SkillMcpIntegrationsCard from './SkillMcpIntegrationsCard';
import { Button } from '@/shared/ui/shadcn/button';
import { Trash2 } from 'lucide-react';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import { useDeleteSkill } from '../api';

export function SkillPage({
  skill,
  isEmbeddingModelEnabled,
}: {
  skill: SkillResponseDto;
  isEmbeddingModelEnabled: boolean;
}) {
  const { t } = useTranslation('skill');
  const deleteSkill = useDeleteSkill();
  const { confirm } = useConfirmation();

  function handleDelete() {
    confirm({
      title: t('delete.confirmTitle'),
      description: t('delete.confirmDescription', { name: skill.name }),
      confirmText: t('delete.confirmText'),
      cancelText: t('delete.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        deleteSkill.mutate({ id: skill.id });
      },
    });
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            title={skill.name}
            action={
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={deleteSkill.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        }
        contentArea={
          <div className="grid gap-4">
            <SkillPropertiesCard skill={skill} />
            <SkillKnowledgeBaseCard
              skill={skill}
              isEnabled={isEmbeddingModelEnabled}
            />
            <SkillMcpIntegrationsCard />
          </div>
        }
      />
    </AppLayout>
  );
}
