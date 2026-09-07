import { useRef, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import { Textarea } from '@ayunis/ui/components/textarea';
import { Trash2, Upload } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import type {
  WorkspaceDocumentResponseDto,
  WorkspaceKnowledgeBaseResponseDto,
  WorkspaceResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  workspaceContextControllerAddKnowledgeBaseDocument,
  workspaceContextControllerRemoveKnowledgeBaseDocument,
  workspaceContextControllerUpdateKnowledgeBase,
} from '@/shared/api/generated/ayunisCoreAPI';

const ACCEPTED_TYPES = '.pdf,.docx,.pptx,.txt,.md,.eml,.mp3,.m4a,.wav,.webm';

export function WorkspaceKnowledgeBaseDetailPage({
  workspace,
  knowledgeBase,
  documents,
}: Readonly<{
  workspace: WorkspaceResponseDto;
  knowledgeBase: WorkspaceKnowledgeBaseResponseDto;
  documents: WorkspaceDocumentResponseDto[];
}>) {
  const { t } = useTranslation('workspace');
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(knowledgeBase.name);
  const [description, setDescription] = useState(
    knowledgeBase.description ?? '',
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await workspaceContextControllerUpdateKnowledgeBase(
        workspace.id,
        knowledgeBase.id,
        { name, description },
      );
      await router.invalidate();
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      await workspaceContextControllerAddKnowledgeBaseDocument(
        workspace.id,
        knowledgeBase.id,
        { file },
      );
      await router.invalidate();
    } finally {
      setUploading(false);
    }
  };

  const remove = async (documentId: string) => {
    await workspaceContextControllerRemoveKnowledgeBaseDocument(
      workspace.id,
      knowledgeBase.id,
      documentId,
    );
    await router.invalidate();
  };

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.breadcrumb'), href: '/workspaces' },
              { label: workspace.name, href: `/workspaces/${workspace.id}` },
              { label: knowledgeBase.name },
            ]}
            badge={
              <Badge
                data-testid="workspace-knowledge-base-detail-badge"
                variant="secondary"
              >
                {t('detail.projectKnowledgeBase')}
              </Badge>
            }
          />
        }
        contentArea={
          <div className="mx-auto max-w-3xl space-y-8">
            <section className="space-y-4">
              <h1 className="text-2xl font-semibold">{knowledgeBase.name}</h1>
              <div className="space-y-2">
                <Label>{t('context.knowledge.name')}</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('context.knowledge.descriptionLabel')}</Label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <Button disabled={saving || !name} onClick={() => void save()}>
                {t('detail.save')}
              </Button>
            </section>

            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {t('detail.documents')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('detail.documentsDescription')}
                  </p>
                </div>
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void upload(file);
                      event.target.value = '';
                    }}
                  />
                  <Button
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInput.current?.click()}
                  >
                    <Upload /> {t('context.documents.upload')}
                  </Button>
                </>
              </div>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('detail.noDocuments')}
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">{document.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {document.status}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('context.documents.remove')}
                        onClick={() => void remove(document.id)}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        }
      />
    </AppLayout>
  );
}
