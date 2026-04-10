import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import ModelsCatalogList from './ModelsCatalogList';
import { ModelsCatalogTabs } from './ModelsCatalogTabs';
import { CreateLanguageModelDialog } from './CreateLanguageModelDialog';
import { EditLanguageModelDialog } from './EditLanguageModelDialog';
import { CreateEmbeddingModelDialog } from './CreateEmbeddingModelDialog';
import { EditEmbeddingModelDialog } from './EditEmbeddingModelDialog';
import { CreateImageGenerationModelDialog } from './CreateImageGenerationModelDialog';
import { EditImageGenerationModelDialog } from './EditImageGenerationModelDialog';
import { Button } from '@/shared/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import type {
  SuperAdminCatalogModelsControllerGetAllCatalogModels200Item,
  LanguageModelResponseDto,
  EmbeddingModelResponseDto,
  ImageGenerationModelResponseDto,
} from '@/shared/api';
import { useDeleteModel } from '../api/useDeleteModel';
import { useConfirmation } from '@/widgets/confirmation-modal';

export default function ModelsCatalogPage({
  models,
}: Readonly<{
  models: SuperAdminCatalogModelsControllerGetAllCatalogModels200Item[];
}>) {
  const { t: tLayout } = useTranslation('super-admin-settings-layout');
  const { t } = useTranslation('super-admin-settings-org');
  const [createLanguageDialogOpen, setCreateLanguageDialogOpen] =
    useState(false);
  const [createEmbeddingDialogOpen, setCreateEmbeddingDialogOpen] =
    useState(false);
  const [createImageGenerationDialogOpen, setCreateImageGenerationDialogOpen] =
    useState(false);
  const [editLanguageModel, setEditLanguageModel] =
    useState<LanguageModelResponseDto | null>(null);
  const [editEmbeddingModel, setEditEmbeddingModel] =
    useState<EmbeddingModelResponseDto | null>(null);
  const [editImageGenerationModel, setEditImageGenerationModel] =
    useState<ImageGenerationModelResponseDto | null>(null);
  const { deleteModel, isDeleting } = useDeleteModel();
  const { confirm } = useConfirmation();

  const activeModels = models.filter((m) => !m.isArchived);
  const archivedModels = models.filter((m) => m.isArchived);

  function handleDeleteModel(
    model: SuperAdminCatalogModelsControllerGetAllCatalogModels200Item,
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
      pageTitle={tLayout('layout.modelsCatalog')}
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">{t('models.catalog.createButton')}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCreateLanguageDialogOpen(true)}>
              {t('models.catalog.createLanguageModel')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setCreateEmbeddingDialogOpen(true)}
            >
              {t('models.catalog.createEmbeddingModel')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setCreateImageGenerationDialogOpen(true)}
            >
              {t('models.catalog.createImageGenerationModel')}
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
            onEditImageGenerationModel={setEditImageGenerationModel}
            onDeleteModel={handleDeleteModel}
            isDeleting={isDeleting}
          />
        )}
        renderArchivedContent={() => (
          <ModelsCatalogList
            models={archivedModels}
            onEditLanguageModel={setEditLanguageModel}
            onEditEmbeddingModel={setEditEmbeddingModel}
            onEditImageGenerationModel={setEditImageGenerationModel}
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
      <CreateImageGenerationModelDialog
        open={createImageGenerationDialogOpen}
        onOpenChange={setCreateImageGenerationDialogOpen}
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
      <EditImageGenerationModelDialog
        model={editImageGenerationModel}
        open={!!editImageGenerationModel}
        onOpenChange={(open) => !open && setEditImageGenerationModel(null)}
      />
    </SuperAdminSettingsLayout>
  );
}
