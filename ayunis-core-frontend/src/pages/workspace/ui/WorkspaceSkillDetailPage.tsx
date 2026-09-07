import { useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import { Textarea } from '@ayunis/ui/components/textarea';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import type {
  WorkspaceKnowledgeBaseResponseDto,
  WorkspaceResponseDto,
  WorkspaceSkillResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  workspaceContextControllerAssignSkillKnowledgeBase,
  workspaceContextControllerUnassignSkillKnowledgeBase,
  workspaceContextControllerUpdateSkill,
} from '@/shared/api/generated/ayunisCoreAPI';

export function WorkspaceSkillDetailPage({
  workspace,
  skill,
  knowledgeBases,
}: Readonly<{
  workspace: WorkspaceResponseDto;
  skill: WorkspaceSkillResponseDto;
  knowledgeBases: WorkspaceKnowledgeBaseResponseDto[];
}>) {
  const { t } = useTranslation('workspace');
  const router = useRouter();
  const [name, setName] = useState(skill.name);
  const [description, setDescription] = useState(skill.shortDescription);
  const [instructions, setInstructions] = useState(skill.instructions);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await workspaceContextControllerUpdateSkill(workspace.id, skill.id, {
        name,
        shortDescription: description,
        instructions,
      });
      await router.invalidate();
    } finally {
      setSaving(false);
    }
  };

  const toggleKnowledgeBase = async (knowledgeBaseId: string) => {
    if (skill.knowledgeBaseIds.includes(knowledgeBaseId)) {
      await workspaceContextControllerUnassignSkillKnowledgeBase(
        workspace.id,
        skill.id,
        knowledgeBaseId,
      );
    } else {
      await workspaceContextControllerAssignSkillKnowledgeBase(
        workspace.id,
        skill.id,
        knowledgeBaseId,
      );
    }
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
              { label: skill.name },
            ]}
            badge={
              <Badge
                data-testid="workspace-skill-detail-badge"
                variant="secondary"
              >
                {t('detail.projectSkill')}
              </Badge>
            }
          />
        }
        contentArea={
          <div className="mx-auto max-w-3xl space-y-8">
            <section className="space-y-4">
              <h1 className="text-2xl font-semibold">{skill.name}</h1>
              <Field label={t('context.skills.name')}>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field label={t('context.skills.shortDescription')}>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              <Field label={t('context.skills.instructions')}>
                <Textarea
                  className="min-h-48"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                />
              </Field>
              <Button
                disabled={saving || !name || !description}
                onClick={() => void save()}
              >
                {t('detail.save')}
              </Button>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {t('detail.skillKnowledge')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('detail.skillKnowledgeDescription')}
                </p>
              </div>
              {knowledgeBases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('detail.noWorkspaceKnowledge')}
                </p>
              ) : (
                <div className="space-y-2">
                  {knowledgeBases.map((knowledgeBase) => {
                    const assigned = skill.knowledgeBaseIds.includes(
                      knowledgeBase.id,
                    );
                    return (
                      <div
                        key={knowledgeBase.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <Link
                          to="/workspaces/$workspaceId/knowledge-bases/$knowledgeBaseId"
                          params={{
                            workspaceId: workspace.id,
                            knowledgeBaseId: knowledgeBase.id,
                          }}
                          className="font-medium hover:underline"
                        >
                          {knowledgeBase.name}
                        </Link>
                        <Button
                          variant={assigned ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() =>
                            void toggleKnowledgeBase(knowledgeBase.id)
                          }
                        >
                          {assigned ? t('detail.detach') : t('detail.attach')}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        }
      />
    </AppLayout>
  );
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
