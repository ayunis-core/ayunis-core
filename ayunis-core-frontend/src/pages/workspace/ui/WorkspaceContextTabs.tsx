import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Database,
  FileText,
  Plus,
  Sparkles,
  Trash,
  Upload,
} from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Textarea } from '@ayunis/ui/components/textarea';
import {
  SourceResponseDtoStatus,
  type WorkspaceContextResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  useWorkspaceContextControllerListKnowledgeBaseCandidates,
  useWorkspaceContextControllerListSkillCandidates,
} from '@/shared/api/generated/ayunisCoreAPI';
import { WorkspaceDocumentStatus } from '@/widgets/workspace-document-status';
import { AddWorkspaceItemsDialog } from './AddWorkspaceItemsDialog';
import { useWorkspaceContextActions } from '../api/useWorkspaceContextActions';

const ACCEPTED_DOCUMENT_FILE_TYPES =
  '.pdf,.docx,.pptx,.txt,.md,.eml,.mp3,.m4a,.wav,.webm';

interface WorkspaceContextTabsProps {
  workspaceId: string;
  context: WorkspaceContextResponseDto;
}

export function WorkspaceSkillsTab({
  workspaceId,
  context,
}: Readonly<WorkspaceContextTabsProps>) {
  const { t } = useTranslation('workspace');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: skillCandidates = [], isLoading: areSkillCandidatesLoading } =
    useWorkspaceContextControllerListSkillCandidates(workspaceId, {
      query: { enabled: isDialogOpen },
    });
  const { attachSkills, detachSkill } = useWorkspaceContextActions(workspaceId);
  const addButton = (
    <Button
      variant="outline"
      size="sm"
      data-testid="workspace-skills-add"
      onClick={() => setIsDialogOpen(true)}
    >
      <Plus /> {t('context.skills.add')}
    </Button>
  );

  return (
    <WorkspaceContextSection
      title={t('context.skills.title')}
      description={t('context.skills.description')}
      action={addButton}
    >
      {context.skills.length === 0 ? (
        <WorkspaceContextEmpty
          icon={<Sparkles />}
          title={t('context.skills.emptyTitle')}
          description={t('context.skills.empty')}
          action={addButton}
        />
      ) : (
        <ItemGroup className="gap-2">
          {context.skills.map((skill) => (
            <WorkspaceContextItem
              key={skill.id}
              testId={`workspace-skill-${skill.id}`}
              icon={<Sparkles />}
              title={skill.name}
              description={skill.shortDescription}
              action={
                <RemoveButton
                  label={t('context.skills.detach')}
                  onClick={() => detachSkill(skill.id)}
                />
              }
            />
          ))}
        </ItemGroup>
      )}
      <AddWorkspaceItemsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={t('context.skills.add')}
        description={t('context.skills.addDescription')}
        isLoading={areSkillCandidatesLoading}
        items={skillCandidates.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.shortDescription,
          isAttached: skill.isAttached,
        }))}
        onConfirm={attachSkills}
      />
    </WorkspaceContextSection>
  );
}

export function WorkspaceKnowledgeTab({
  workspaceId,
  context,
}: Readonly<WorkspaceContextTabsProps>) {
  const { t } = useTranslation('workspace');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const {
    data: knowledgeBaseCandidates = [],
    isLoading: areKnowledgeBaseCandidatesLoading,
  } = useWorkspaceContextControllerListKnowledgeBaseCandidates(workspaceId, {
    query: { enabled: isDialogOpen },
  });
  const {
    attachKnowledgeBases,
    detachKnowledgeBase,
    removeDocument,
    uploadDocument,
    isUploadingDocument,
  } = useWorkspaceContextActions(workspaceId);

  return (
    <div className="space-y-6">
      <WorkspaceContextSection
        title={t('context.knowledge.title')}
        description={t('context.knowledge.description')}
        action={
          <Button
            variant="outline"
            size="sm"
            data-testid="workspace-knowledge-add"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus /> {t('context.knowledge.add')}
          </Button>
        }
      >
        <KnowledgeBaseList context={context} onDetach={detachKnowledgeBase} />
      </WorkspaceContextSection>
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
                if (file) uploadDocument(file);
                event.target.value = '';
              }}
            />
            <Button
              variant="outline"
              size="sm"
              data-testid="workspace-document-upload"
              disabled={isUploadingDocument}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload /> {t('context.documents.upload')}
            </Button>
          </>
        }
      >
        <DocumentList context={context} onRemove={removeDocument} />
      </WorkspaceContextSection>
      <AddWorkspaceItemsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={t('context.knowledge.add')}
        description={t('context.knowledge.addDescription')}
        isLoading={areKnowledgeBaseCandidatesLoading}
        items={knowledgeBaseCandidates.map((knowledgeBase) => ({
          id: knowledgeBase.id,
          name: knowledgeBase.name,
          description:
            typeof knowledgeBase.description === 'string'
              ? knowledgeBase.description
              : null,
          meta: t('context.knowledge.documentCount', {
            count: knowledgeBase.documentCount,
          }),
          isAttached: knowledgeBase.isAttached,
        }))}
        onConfirm={attachKnowledgeBases}
      />
    </div>
  );
}

export function WorkspaceInstructionsTab({
  workspaceId,
  value,
  onChange,
  onSaved,
}: Readonly<{
  workspaceId: string;
  value: string;
  onChange: (value: string) => void;
  onSaved: (value: string | null) => void;
}>) {
  const { t } = useTranslation('workspace');
  const { updateInstruction, isSavingInstruction } =
    useWorkspaceContextActions(workspaceId);

  return (
    <WorkspaceContextSection
      title={t('context.instructions.title')}
      description={t('context.instructions.description')}
    >
      <Textarea
        value={value}
        data-testid="workspace-instruction-input"
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          onChange(event.target.value)
        }
        placeholder={t('context.instructions.placeholder')}
        rows={8}
      />
      <div className="flex justify-end">
        <Button
          data-testid="workspace-instruction-save"
          disabled={isSavingInstruction}
          onClick={() => {
            const savedValue = value.trim() || null;
            void updateInstruction(savedValue)
              .then(() => onSaved(savedValue))
              .catch(() => undefined);
          }}
        >
          {t('context.instructions.save')}
        </Button>
      </div>
    </WorkspaceContextSection>
  );
}

function KnowledgeBaseList({
  context,
  onDetach,
}: Readonly<{
  context: WorkspaceContextResponseDto;
  onDetach: (knowledgeBaseId: string) => void;
}>) {
  const { t } = useTranslation('workspace');
  if (context.knowledgeBases.length === 0) {
    return (
      <WorkspaceContextEmpty
        icon={<Database />}
        title={t('context.knowledge.emptyTitle')}
        description={t('context.knowledge.empty')}
      />
    );
  }

  return (
    <ItemGroup className="gap-2">
      {context.knowledgeBases.map((knowledgeBase) => (
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
  );
}

function DocumentList({
  context,
  onRemove,
}: Readonly<{
  context: WorkspaceContextResponseDto;
  onRemove: (documentId: string) => void;
}>) {
  const { t } = useTranslation('workspace');
  if (context.documents.length === 0) {
    return (
      <WorkspaceContextEmpty
        icon={<FileText />}
        title={t('context.documents.emptyTitle')}
        description={t('context.documents.empty')}
      />
    );
  }

  return (
    <ItemGroup className="gap-2">
      {context.documents.map((document) => (
        <WorkspaceContextItem
          key={document.id}
          testId={`workspace-document-${document.id}`}
          icon={<FileText />}
          title={document.name}
          description={
            document.status === SourceResponseDtoStatus.ready ? undefined : (
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
  );
}

function WorkspaceContextSection({
  title,
  description,
  action,
  children,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function WorkspaceContextItem({
  icon,
  title,
  description,
  action,
  testId,
}: Readonly<{
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action: ReactNode;
  testId?: string;
}>) {
  return (
    <Item variant="outline" data-testid={testId}>
      <ItemMedia variant="icon">{icon}</ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        {description && <ItemDescription>{description}</ItemDescription>}
      </ItemContent>
      <ItemActions>{action}</ItemActions>
    </Item>
  );
}

function WorkspaceContextEmpty({
  icon,
  title,
  description,
  action,
}: Readonly<{
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <Empty>
      <EmptyMedia variant="icon">{icon}</EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

function RemoveButton({
  label,
  onClick,
}: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label={label}>
      <Trash className="text-destructive" />
    </Button>
  );
}
