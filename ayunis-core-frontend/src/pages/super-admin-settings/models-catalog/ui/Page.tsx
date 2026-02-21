import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import ModelsCatalogList from './ModelsCatalogList';
import { ModelsCatalogTabs } from './ModelsCatalogTabs';
import { CreateLanguageModelDialog } from './CreateLanguageModelDialog';
import { EditLanguageModelDialog } from './EditLanguageModelDialog';
import { CreateEmbeddingModelDialog } from './CreateEmbeddingModelDialog';
import { EditEmbeddingModelDialog } from './EditEmbeddingModelDialog';
import { Button } from '@/shared/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import type {
  SuperAdminModelsControllerGetAllCatalogModels200Item,
  LanguageModelResponseDto,
  EmbeddingModelResponseDto,
} from '@/shared/api';
import { useDeleteModel } from '../api/useDeleteModel';
import { useConfirmation } from '@/widgets/confirmation-modal';

export default function ModelsCatalogPage({
  models,
}: Readonly<{
  models: SuperAdminModelsControllerGetAllCatalogModels200Item[];
}>) {
  const { t } = useTranslation('super-admin-settings-layout');
  const [createLanguageDialogOpen, setCreateLanguageDialogOpen] =
    useState(false);
  const [createEmbeddingDialogOpen, setCreateEmbeddingDialogOpen] =
    useState(false);
  const [editLanguageModel, setEditLanguageModel] =
    useState<LanguageModelResponseDto | null>(null);
  const [editEmbeddingModel, setEditEmbeddingModel] =
    useState<EmbeddingModelResponseDto | null>(null);
  const { deleteModel, isDeleting } = useDeleteModel();
  const { confirm } = useConfirmation();

  const activeModels = models.filter((m) => !m.isArchived);
  const archivedModels = models.filter((m) => m.isArchived);

  function handleDeleteModel(
    model: SuperAdminModelsControllerGetAllCatalogModels200Item,
  ) {
    confirm({
      title: 'Delete model',
      description: `Are you sure you want to delete ${model.displayName}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      onConfirm: () => {
        deleteModel(model.id);
      },
    });
  }

  return (
    <SuperAdminSettingsLayout
      pageTitle={t('layout.modelsCatalog')}
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">Create Model</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCreateLanguageDialogOpen(true)}>
              Language Model
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setCreateEmbeddingDialogOpen(true)}
            >
              Embedding Model
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <ModelsCatalogTabs
        activeCount={activeModels.length}
        archivedCount={archivedModels.length}
        renderActiveContent={() => (
          <ModelsCatalogList
            models={activeModels}
            onEditLanguageModel={setEditLanguageModel}
            onEditEmbeddingModel={setEditEmbeddingModel}
            onDeleteModel={handleDeleteModel}
            isDeleting={isDeleting}
          />
        )}
        renderArchivedContent={() => (
          <ModelsCatalogList
            models={archivedModels}
            onEditLanguageModel={setEditLanguageModel}
            onEditEmbeddingModel={setEditEmbeddingModel}
            onDeleteModel={handleDeleteModel}
            isDeleting={isDeleting}
            isArchivedView
          />
        )}
      />

      {/* Dialogs */}
      <CreateLanguageModelDialog
        open={createLanguageDialogOpen}
        onOpenChange={setCreateLanguageDialogOpen}
      />
      <CreateEmbeddingModelDialog
        open={createEmbeddingDialogOpen}
        onOpenChange={setCreateEmbeddingDialogOpen}
      />
      <EditLanguageModelDialog
        model={editLanguageModel}
        open={!!editLanguageModel}
        onOpenChange={(open) => !open && setEditLanguageModel(null)}
      />
      <EditEmbeddingModelDialog
        model={editEmbeddingModel}
        open={!!editEmbeddingModel}
        onOpenChange={(open) => !open && setEditEmbeddingModel(null)}
      />
    </SuperAdminSettingsLayout>
  );
}
