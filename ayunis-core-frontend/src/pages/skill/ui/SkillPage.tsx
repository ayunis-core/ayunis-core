import AppLayout from '@/layouts/app-layout';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type {
  ShareResponseDto,
  TeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import SkillPropertiesCard from './SkillPropertiesCard';
import SkillKnowledgeBaseCard from './SkillKnowledgeBaseCard';
import SkillMcpIntegrationsCard from './SkillMcpIntegrationsCard';
import { SharesTab } from '@/widgets/shares-tab';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui/shadcn/tabs';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import { Trash2 } from 'lucide-react';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeleteSkill } from '../api';

export function SkillPage({
  skill,
  shares,
  userTeams,
  isEmbeddingModelEnabled,
  initialTab = 'config',
}: {
  skill: SkillResponseDto;
  shares: ShareResponseDto[];
  userTeams: TeamResponseDto[];
  isEmbeddingModelEnabled: boolean;
  initialTab?: 'config' | 'share';
}) {
  const navigate = useNavigate();
  const { t } = useTranslation('skill');
  const { id } = useParams({
    from: '/_authenticated/skills/$id',
  });
  const deleteSkill = useDeleteSkill();
  const { confirm } = useConfirmation();

  const handleTabChange = useCallback(
    (value: string) => {
      void navigate({
        to: '/skills/$id',
        params: { id },
        search: value === 'config' ? {} : { tab: value as 'share' },
      });
    },
    [navigate, id],
  );

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

  const isReadOnly = skill.isShared;

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            title={skill.name}
            badge={
              isReadOnly ? (
                <Badge variant="secondary">{t('shared.badge')}</Badge>
              ) : undefined
            }
            action={
              !isReadOnly ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  disabled={deleteSkill.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : undefined
            }
          />
        }
        contentArea={
          isReadOnly ? (
            <div className="grid gap-4">
              <SkillPropertiesCard skill={skill} disabled />
            </div>
          ) : (
            <Tabs
              value={initialTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="config">
                  {t('tabs.configuration')}
                </TabsTrigger>
                <TabsTrigger value="share">{t('tabs.shares')}</TabsTrigger>
              </TabsList>
              <TabsContent value="config" className="mt-4">
                <div className="grid gap-4">
                  <SkillPropertiesCard skill={skill} />
                  <SkillKnowledgeBaseCard
                    skill={skill}
                    isEnabled={isEmbeddingModelEnabled}
                  />
                  <SkillMcpIntegrationsCard />
                </div>
              </TabsContent>
              <TabsContent value="share" className="mt-4">
                <SharesTab
                  entityType="skill"
                  entityId={skill.id}
                  shares={shares}
                  userTeams={userTeams}
                />
              </TabsContent>
            </Tabs>
          )
        }
      />
    </AppLayout>
  );
}
