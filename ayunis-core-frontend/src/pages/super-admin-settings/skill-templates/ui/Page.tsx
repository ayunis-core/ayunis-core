import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SkillTemplateResponseDto } from '@/shared/api';
import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import { SkillTemplateItem } from './SkillTemplateItem';
import { CreateSkillTemplateDialog } from './CreateSkillTemplateDialog';
import { EditSkillTemplateDialog } from './EditSkillTemplateDialog';
import { useDeleteSkillTemplate } from '../api/useDeleteSkillTemplate';
import { useUpdateSkillTemplate } from '../api/useUpdateSkillTemplate';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { ItemGroup, ItemSeparator } from '@/shared/ui/shadcn/item';
import { Fragment } from 'react/jsx-runtime';

interface SkillTemplatesPageProps {
  skillTemplates: SkillTemplateResponseDto[];
}

export default function SkillTemplatesPage({
  skillTemplates,
}: Readonly<SkillTemplatesPageProps>) {
  const { t } = useTranslation('super-admin-settings-skills');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] =
    useState<SkillTemplateResponseDto | null>(null);
  const { deleteSkillTemplate, isDeleting } = useDeleteSkillTemplate();
  const { updateSkillTemplate } = useUpdateSkillTemplate();
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const { confirm } = useConfirmation();

  function handleToggle(template: SkillTemplateResponseDto) {
    setTogglingIds((prev) => new Set(prev).add(template.id));
    void updateSkillTemplate(template.id, {
      isActive: !template.isActive,
    })
      .catch(() => {
        /* error already handled by mutation onError */
      })
      .finally(() => {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(template.id);
          return next;
        });
      });
  }

  function handleDelete(template: SkillTemplateResponseDto) {
    confirm({
      title: t('delete.title'),
      description: t('delete.description', { name: template.name }),
      confirmText: t('delete.confirm'),
      cancelText: t('delete.cancel'),
      variant: 'destructive',
      onConfirm: () => {
        deleteSkillTemplate(template.id);
      },
    });
  }

  return (
    <SuperAdminSettingsLayout
      pageTitle={t('page.title')}
      action={
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          {t('page.createButton')}
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('page.title')}</CardTitle>
          <CardDescription>{t('page.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {skillTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
              <h3 className="text-lg font-semibold">{t('page.empty')}</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t('page.emptyDescription')}
              </p>
            </div>
          ) : (
            <ItemGroup>
              {skillTemplates.map((template, index) => (
                <Fragment key={template.id}>
                  <SkillTemplateItem
                    template={template}
                    onEdit={() => setEditTemplate(template)}
                    onDelete={() => handleDelete(template)}
                    onToggleEnabled={() => handleToggle(template)}
                    isDeleting={isDeleting}
                    isToggling={togglingIds.has(template.id)}
                  />
                  {index < skillTemplates.length - 1 && <ItemSeparator />}
                </Fragment>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>

      <CreateSkillTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <EditSkillTemplateDialog
        template={editTemplate}
        open={!!editTemplate}
        onOpenChange={(open) => !open && setEditTemplate(null)}
      />
    </SuperAdminSettingsLayout>
  );
}
