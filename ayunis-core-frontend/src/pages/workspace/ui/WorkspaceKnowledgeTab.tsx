import { useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, FileText, Plus, Upload } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup } from '@ayunis/ui/components/item';
import {
  SourceResponseDtoStatus,
  type WorkspaceDocumentResponseDto,
  type WorkspaceKnowledgeBaseResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  useWorkspaceContextControllerListDocuments,
  useKnowledgeBasesControllerFindAll,
  useWorkspaceContextControllerListKnowledgeBases,
} from '@/shared/api/generated/ayunisCoreAPI';
import { WorkspaceDocumentStatus } from '@/widgets/workspace-document-status';
import { AddWorkspaceItemsDialog } from './AddWorkspaceItemsDialog';
import {
  RemoveButton,
  WorkspaceContextEmpty,
  WorkspaceContextItem,
  WorkspaceContextPagination,
  WorkspaceContextSection,
} from './WorkspaceContextList';
import { CONTEXT_PAGE_SIZE, pageTotal } from './WorkspaceContextList.model';
import { useWorkspaceContextActions } from '@/pages/workspace/api/useWorkspaceContextActions';
import {
  CreateWorkspaceResourceDialog,
  type WorkspaceResourceFormData,
} from './CreateWorkspaceResourceDialog';

const ACCEPTED_DOCUMENT_FILE_TYPES =
  '.pdf,.docx,.pptx,.txt,.md,.eml,.mp3,.m4a,.wav,.webm';

export function WorkspaceKnowledgeTab({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const { t } = useTranslation('workspace');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [knowledgePage, setKnowledgePage] = useState(1);
  const [documentPage, setDocumentPage] = useState(1);
  const knowledgeParams = {
    limit: CONTEXT_PAGE_SIZE,
    offset: (knowledgePage - 1) * CONTEXT_PAGE_SIZE,
  };
  const documentParams = {
    limit: CONTEXT_PAGE_SIZE,
    offset: (documentPage - 1) * CONTEXT_PAGE_SIZE,
  };
  const { data: knowledgePageData, isLoading: isKnowledgeLoading } =
    useWorkspaceContextControllerListKnowledgeBases(
      workspaceId,
      knowledgeParams,
    );
  const { data: documentPageData, isLoading: isDocumentLoading } =
    useWorkspaceContextControllerListDocuments(workspaceId, documentParams, {
      query: {
        refetchInterval: (query) =>
          query.state.data?.data.some(
            (document) =>
              document.status === SourceResponseDtoStatus.processing,
          )
            ? 5000
            : false,
      },
    });
  const { data: personalKnowledgeBases, isLoading: areCandidatesLoading } =
    useKnowledgeBasesControllerFindAll({
      query: { enabled: isDialogOpen },
    });
  const {
    createKnowledgeBase,
    copyKnowledgeBases,
    deleteKnowledgeBase,
    removeDocument,
    uploadDocument,
    isUploadingDocument,
  } = useWorkspaceContextActions(workspaceId);

  return (
    <div className="space-y-6">
      <WorkspaceKnowledgeBaseSection
        items={knowledgePageData?.data ?? []}
        isLoading={isKnowledgeLoading}
        page={knowledgePage}
        total={pageTotal(knowledgePageData?.pagination)}
        onPageChange={setKnowledgePage}
        onDetach={deleteKnowledgeBase}
        onAdd={() => setIsDialogOpen(true)}
        onCreate={(data) =>
          createKnowledgeBase({
            name: data.name,
            description: data.description,
          })
        }
      />
      <WorkspaceDocumentsSection
        items={documentPageData?.data ?? []}
        isLoading={isDocumentLoading}
        page={documentPage}
        total={pageTotal(documentPageData?.pagination)}
        onPageChange={setDocumentPage}
        onRemove={removeDocument}
        fileInputRef={fileInputRef}
        isUploading={isUploadingDocument}
        onUpload={(file) => uploadDocument(file)}
      />
      <AddWorkspaceItemsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={t('context.knowledge.add')}
        description={t('context.knowledge.addDescription')}
        isLoading={areCandidatesLoading}
        items={(personalKnowledgeBases?.data ?? [])
          .filter((knowledgeBase) => !knowledgeBase.isShared)
          .map((knowledgeBase) => ({
            id: knowledgeBase.id,
            name: knowledgeBase.name,
            description: knowledgeBase.description,
            isAttached: false,
          }))}
        currentPage={1}
        onPageChange={() => undefined}
        onConfirm={copyKnowledgeBases}
      />
    </div>
  );
}

function WorkspaceKnowledgeBaseSection({
  items,
  isLoading,
  page,
  total,
  onPageChange,
  onDetach,
  onAdd,
  onCreate,
}: Readonly<{
  items: WorkspaceKnowledgeBaseResponseDto[];
  isLoading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onDetach: (id: string) => void;
  onAdd: () => void;
  onCreate: (data: WorkspaceResourceFormData) => Promise<unknown>;
}>) {
  const { t } = useTranslation('workspace');
  const addButton = (
    <div className="flex gap-2">
      <CreateWorkspaceResourceDialog
        buttonText={t('context.knowledge.create')}
        title={t('context.knowledge.create')}
        description={t('context.knowledge.createDescription')}
        nameLabel={t('context.knowledge.name')}
        descriptionLabel={t('context.knowledge.descriptionLabel')}
        confirmText={t('context.knowledge.create')}
        onCreate={onCreate}
      />
      <Button
        variant="outline"
        size="sm"
        data-testid="workspace-knowledge-add"
        onClick={onAdd}
      >
        <Plus /> {t('context.knowledge.add')}
      </Button>
    </div>
  );

  return (
    <WorkspaceContextSection
      title={t('context.knowledge.title')}
      description={t('context.knowledge.description')}
      action={addButton}
    >
      {isLoading ? <p>{t('context.addDialog.loading')}</p> : null}
      {!isLoading && items.length === 0 ? (
        <WorkspaceContextEmpty
          icon={<Database />}
          title={t('context.knowledge.emptyTitle')}
          description={t('context.knowledge.empty')}
          action={addButton}
        />
      ) : null}
      {items.length > 0 ? (
        <ItemGroup className="gap-2">
          {items.map((knowledgeBase) => (
            <WorkspaceContextItem
              key={knowledgeBase.id}
              testId={`workspace-knowledge-base-${knowledgeBase.id}`}
              icon={<Database />}
              title={knowledgeBase.name}
              description={t('context.knowledge.documentCount', {
                count: knowledgeBase.documentCount,
              })}
              action={
                <RemoveButton
                  label={t('context.knowledge.detach')}
                  onClick={() => onDetach(knowledgeBase.id)}
                />
              }
            />
          ))}
        </ItemGroup>
      ) : null}
      <WorkspaceContextPagination
        page={page}
        total={total}
        testId="workspace-knowledge-pagination"
        onPageChange={onPageChange}
      />
    </WorkspaceContextSection>
  );
}

function WorkspaceDocumentsSection({
  items,
  isLoading,
  page,
  total,
  onPageChange,
  onRemove,
  fileInputRef,
  isUploading,
  onUpload,
}: Readonly<{
  items: WorkspaceDocumentResponseDto[];
  isLoading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onRemove: (id: string) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  onUpload: (file: File) => void;
}>) {
  const { t } = useTranslation('workspace');
  return (
    <WorkspaceContextSection
      title={t('context.documents.title')}
      description={t('context.documents.description')}
      action={
        <>
          <input
            ref={fileInputRef}
            type="file"
            data-testid="workspace-document-file-input"
            className="hidden"
            accept={ACCEPTED_DOCUMENT_FILE_TYPES}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = '';
            }}
          />
          <Button
            variant="outline"
            size="sm"
            data-testid="workspace-document-upload"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload /> {t('context.documents.upload')}
          </Button>
        </>
      }
    >
      {isLoading ? <p>{t('context.addDialog.loading')}</p> : null}
      {!isLoading && items.length === 0 ? (
        <WorkspaceContextEmpty
          icon={<FileText />}
          title={t('context.documents.emptyTitle')}
          description={t('context.documents.empty')}
        />
      ) : null}
      {items.length > 0 ? (
        <ItemGroup className="gap-2">
          {items.map((document) => (
            <WorkspaceContextItem
              key={document.id}
              testId={`workspace-document-${document.id}`}
              icon={<FileText />}
              title={document.name}
              description={
                document.status ===
                SourceResponseDtoStatus.ready ? undefined : (
                  <WorkspaceDocumentStatus status={document.status} />
                )
              }
              action={
                <RemoveButton
                  label={t('context.documents.remove')}
                  onClick={() => onRemove(document.id)}
                />
              }
            />
          ))}
        </ItemGroup>
      ) : null}
      <WorkspaceContextPagination
        page={page}
        total={total}
        testId="workspace-documents-pagination"
        onPageChange={onPageChange}
      />
    </WorkspaceContextSection>
  );
}
